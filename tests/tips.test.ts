import { describe, expect, it } from 'vitest';
import { SIZES } from '../src/config/cup';
import { START_CASH, getStockDef } from '../src/config/inventory';
import { TIP } from '../src/config/scoring';
import { creditCup, emptyStaffDay, splitTip, tipForCup } from '../src/core/economy';
import { reduce } from '../src/core/reducer';
import { stationScores } from '../src/core/scoring';
import { canPerform, soloOwners, stationOwners } from '../src/core/stations';
import type { Action, GameEvent, ShopState } from '../src/core/types';
import { upgradeEffects } from '../src/core/upgrades';
import { SPEC, stateWithCustomer } from './helpers';

const fillM = (SIZES.M.greenMin + SIZES.M.greenMax) / 2;

/** Áp dụng lần lượt [thao tác, người làm]. */
function play(state: ShopState, steps: [Action, string][]) {
  const events: GameEvent[] = [];
  for (const [action, actor] of steps) {
    const r = reduce(state, action, actor);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

/** Ba người làm một ly: a ở Quầy trà, b ở Kệ topping, c ở Thu ngân. `sugarTaps` để làm sai đường. */
function teamCup(sugarTaps = 2) {
  const syrup: [Action, string][] = [];
  for (let i = 0; i < sugarTaps; i++) syrup.push([{ type: 'TAP_SYRUP', cupId: 'cup1' }, 'b']);
  const steps: [Action, string][] = [
    [{ type: 'PICK_CUP', size: 'M' }, 'a'],
    [{ type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: fillM }, 'a'],
    [{ type: 'PASS_CUP', cupId: 'cup1', to: 'topping' }, 'a'],
    ...syrup,
    [{ type: 'SCOOP_ICE', cupId: 'cup1' }, 'b'],
    [{ type: 'SCOOP_ICE', cupId: 'cup1' }, 'b'],
    [{ type: 'ADD_TOPPING', cupId: 'cup1', topping: 'pearl-white' }, 'b'],
    [{ type: 'PASS_CUP', cupId: 'cup1', to: 'cashier' }, 'b'],
    [{ type: 'SEAL_CUP', cupId: 'cup1' }, 'c'],
    [{ type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' }, 'c'],
  ];
  return play({ ...stateWithCustomer(), solo: false }, steps);
}

describe('tip của một ly', () => {
  it('dưới mức hài lòng thì không có tip', () => {
    expect(tipForCup(38000, TIP.minScore - 1)).toBe(0);
  });

  it('ly 100 điểm: giá × tỉ lệ, làm tròn 500 đồng', () => {
    expect(tipForCup(38000, 100)).toBe(7500);
    expect(tipForCup(38000, 100) % TIP.roundTo).toBe(0);
  });

  it('nâng cấp hũ tip nhân thêm', () => {
    expect(tipForCup(40000, 100, 1.25)).toBe(10000);
  });
});

describe('chia tip theo điểm trạm', () => {
  it('chia đúng tỉ lệ điểm', () => {
    expect(splitTip(9000, [{ uid: 'a', score: 100 }, { uid: 'b', score: 50 }])).toEqual({ a: 6000, b: 3000 });
  });

  it('một người giữ nhiều trạm thì cộng điểm các trạm', () => {
    const tips = splitTip(6000, [
      { uid: 'a', score: 100 },
      { uid: 'a', score: 100 },
      { uid: 'b', score: 100 },
    ]);
    expect(tips).toEqual({ a: 4000, b: 2000 });
  });

  it('tổng các phần luôn đúng bằng tip (không lệch đồng nào)', () => {
    const tips = splitTip(1000, [{ uid: 'a', score: 33 }, { uid: 'b', score: 33 }, { uid: 'c', score: 34 }]);
    expect(Object.values(tips).reduce((x, y) => x + y, 0)).toBe(1000);
  });

  it('mọi người 0 điểm thì chia đều; không có ai hoặc tip 0 thì rỗng', () => {
    expect(splitTip(1000, [{ uid: 'a', score: 0 }, { uid: 'b', score: 0 }])).toEqual({ a: 500, b: 500 });
    expect(splitTip(1000, [])).toEqual({});
    expect(splitTip(0, [{ uid: 'a', score: 100 }])).toEqual({});
  });

  it('ghi công: mỗi người +1 ly và điểm ở trạm mình làm, cộng tip', () => {
    const staff = creditCup(
      {},
      { tea: 'a', topping: 'b', cashier: 'a' },
      { tea: 90, topping: 70, cashier: 100 },
      { a: 3000, b: 1000 },
    );
    expect(staff.a.cups).toEqual({ tea: 1, topping: 0, cashier: 1 });
    expect(staff.a.score.tea).toBe(90);
    expect(staff.a.tips).toBe(3000);
    expect(staff.b.score.topping).toBe(70);
    expect(emptyStaffDay().tips).toBe(0);
  });
});

describe('điểm cá nhân theo trạm', () => {
  const cup = {
    id: 'cup1',
    size: 'M' as const,
    tea: 'matcha',
    fill: fillM,
    sugarTaps: 2,
    iceScoops: 2,
    toppings: [{ id: 'pearl-white', scoops: 1 }],
    sealed: true,
    ruined: false,
    cost: 0,
    station: 'cashier' as const,
    forCustomer: 'k1',
    makers: {},
  };

  it('ly đúng hết, giao ngay: 100 ở cả ba trạm', () => {
    expect(stationScores(SPEC, cup, 'k1', 1)).toEqual({ tea: 100, topping: 100, cashier: 100 });
  });

  it('sai đường chỉ trừ điểm Kệ topping; sai size chỉ trừ Quầy trà', () => {
    const s1 = stationScores(SPEC, { ...cup, sugarTaps: 4 }, 'k1', 1);
    expect(s1.topping).toBeLessThan(100);
    expect(s1.tea).toBe(100);
    const s2 = stationScores(SPEC, { ...cup, size: 'L' }, 'k1', 1);
    expect(s2.tea).toBeLessThan(100);
    expect(s2.topping).toBe(100);
  });

  it('giao nhầm khách hoặc chậm thì trừ điểm Thu ngân', () => {
    expect(stationScores(SPEC, cup, 'k2', 1).cashier).toBe(50);
    expect(stationScores(SPEC, cup, 'k1', 0.5).cashier).toBe(75);
  });
});

describe('reducer: ghi ai làm ly và chia tip', () => {
  it('ba người làm một ly hoàn hảo: tip chia đều, két không nhận tip', () => {
    const { state, events } = teamCup();
    const served = events.find((e) => e.type === 'served');
    expect(served?.type === 'served' && served.tip).toBe(7500);
    expect(served?.type === 'served' && served.tips).toEqual({ a: 2500, b: 2500, c: 2500 });
    expect(state.cash).toBe(START_CASH + 38000);
    expect(state.today.staff.b.cups.topping).toBe(1);
    expect(state.today.staff.c.tips).toBe(2500);
  });

  it('người làm sai được ít tip hơn', () => {
    const { state } = teamCup(4); // đường 100% thay vì 50%
    expect(state.today.staff.b.tips).toBeLessThan(state.today.staff.a.tips);
    const total = ['a', 'b', 'c'].reduce((s, u) => s + state.today.staff[u].tips, 0);
    expect(total % TIP.roundTo).toBe(0);
  });

  it('chơi một mình: cả ba trạm là một người, nhận cả tip', () => {
    const { state } = play(stateWithCustomer(), [
      [{ type: 'PICK_CUP', size: 'M' }, 'me'],
      [{ type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: fillM }, 'me'],
      [{ type: 'TAP_SYRUP', cupId: 'cup1' }, 'me'],
      [{ type: 'TAP_SYRUP', cupId: 'cup1' }, 'me'],
      [{ type: 'SCOOP_ICE', cupId: 'cup1' }, 'me'],
      [{ type: 'SCOOP_ICE', cupId: 'cup1' }, 'me'],
      [{ type: 'ADD_TOPPING', cupId: 'cup1', topping: 'pearl-white' }, 'me'],
      [{ type: 'SEAL_CUP', cupId: 'cup1' }, 'me'],
      [{ type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' }, 'me'],
    ]);
    expect(state.today.staff.me.tips).toBe(7500);
    expect(state.today.staff.me.cups).toEqual({ tea: 1, topping: 1, cashier: 1 });
  });
});

describe('nâng cấp và trang trí', () => {
  it('mua nâng cấp: trừ két, ghi chi phí, không mua lại được', () => {
    const s = { ...stateWithCustomer(), day: 2 };
    const r = reduce(s, { type: 'BUY_UPGRADE', id: 'bench' });
    expect(r.state.upgrades).toEqual(['bench']);
    expect(r.state.cash).toBe(START_CASH - 300_000);
    expect(r.state.today.upgrade).toBe(300_000);
    const again = reduce(r.state, { type: 'BUY_UPGRADE', id: 'bench' });
    expect(again.events[0]).toMatchObject({ type: 'rejected', reason: 'alreadyOwned' });
  });

  it('chưa tới ngày hoặc không đủ tiền thì bị từ chối; đồ trang trí vào danh sách riêng', () => {
    const s = stateWithCustomer();
    expect(reduce(s, { type: 'BUY_UPGRADE', id: 'sign' }).events[0]).toMatchObject({ reason: 'tooEarly' });
    expect(reduce({ ...s, cash: 0 }, { type: 'BUY_UPGRADE', id: 'plant' }).events[0]).toMatchObject({ reason: 'noMoney' });
    const r = reduce(s, { type: 'BUY_UPGRADE', id: 'plant' });
    expect(r.state.decor).toEqual(['plant']);
    expect(r.state.upgrades).toEqual([]);
  });

  it('tác dụng gộp: ghế chờ, bảng hiệu, hũ tip; mối nhập hàng làm nhập rẻ hơn', () => {
    const fx = upgradeEffects(['bench', 'supplier', 'sign', 'tip-jar']);
    expect(fx.patienceFactor).toBeCloseTo(0.85);
    expect(fx.extraCustomers).toBe(2);
    expect(fx.tipFactor).toBeCloseTo(1.25);
    const s: ShopState = { ...stateWithCustomer(), upgrades: ['supplier'], phase: 'prep' };
    const r = reduce(s, { type: 'RESTOCK', item: 'ice' });
    expect(START_CASH - r.state.cash).toBe(Math.round((getStockDef('ice').packPrice * 0.9) / 100) * 100);
  });
});

describe('quyền chi tiền két', () => {
  const owners = stationOwners([
    { uid: 'owner', station: 'cashier', joinedAt: 1 },
    { uid: 'b', station: 'stock', joinedAt: 2 },
    { uid: 'c', station: 'tea', joinedAt: 3 },
  ]);
  const s = stateWithCustomer();
  const buy: Action = { type: 'RESTOCK', item: 'ice' };

  it('chủ tiệm luôn được chi, dù không ở trạm Kho', () => {
    expect(canPerform(s, owners, 'owner', buy, true, { ownerUid: 'owner', allowStock: false })).toBeNull();
  });

  it('người ở trạm Kho chỉ được chi khi host cho phép', () => {
    expect(canPerform(s, owners, 'b', buy, false, { ownerUid: 'owner', allowStock: false })).toBe('notOwner');
    expect(canPerform(s, owners, 'b', buy, false, { ownerUid: 'owner', allowStock: true })).toBeNull();
  });

  it('người khác không bao giờ được chi', () => {
    const rule = { ownerUid: 'owner', allowStock: true };
    expect(canPerform(s, owners, 'c', buy, false, rule)).toBe('notOwner');
    expect(canPerform(s, owners, 'c', { type: 'BUY_UPGRADE', id: 'plant' }, false, rule)).toBe('notOwner');
  });

  it('chơi một mình: luôn được chi', () => {
    expect(canPerform(s, soloOwners('me'), 'me', buy, true)).toBeNull();
  });
});
