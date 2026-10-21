import { describe, expect, it } from 'vitest';
import {
  CREDIT,
  RENT_PER_DAY,
  RUSH,
  STOCK_ICE,
  getStockDef,
  packOf,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
  unitCost,
} from '../src/config/inventory';
import { SCORING, STOCK_SCORING } from '../src/config/scoring';
import { closeDay, emptyDayStats, planHostActions, stockScoreOf } from '../src/core/day';
import { cupPrice } from '../src/core/economy';
import { consume, lotsFromStock, needsOf, restockPrice } from '../src/core/inventory';
import { createShopState, newShop, reduce } from '../src/core/reducer';
import type { ShopState } from '../src/core/types';
import { decodeLots } from '../src/net/serialize';
import { createSave, defaultSettings, migrate, normalizeShop, shopSaveOf } from '../src/save/schema';
import { SPEC, makeCustomer, run, stateWithCustomer } from './helpers';

const prep = (s: ShopState = createShopState(5)): ShopState => ({ ...s, phase: 'prep' });
const milk = stockIdOfTea('milk');

describe('buổi sáng chuẩn bị', () => {
  it('tiệm mới bắt đầu bằng buổi sáng chuẩn bị, kho có lô hàng khớp số tồn', () => {
    const s = newShop(1);
    expect(s.phase).toBe('prep');
    for (const [id, n] of Object.entries(s.stock)) expect((s.lots[id] ?? []).reduce((a, l) => a + l.qty, 0)).toBe(n);
  });

  it('chưa mở cửa: đồng hồ đứng yên, không có khách, không pha được', () => {
    const s = prep();
    expect(reduce(s, { type: 'TICK', dt: 5000 }).state.time).toBe(0);
    expect(planHostActions(s)).toEqual([]);
    expect(reduce(s, { type: 'PICK_CUP', size: 'M' }).events[0]).toMatchObject({ reason: 'notOpenYet' });
    expect(reduce(s, { type: 'CUSTOMER_ARRIVE', customer: makeCustomer(SPEC) }).events[0]).toMatchObject({ reason: 'notOpenYet' });
  });

  it('bấm Mở cửa thì bắt đầu bán; mở lần nữa bị từ chối', () => {
    const r = reduce(prep(), { type: 'OPEN_SHOP' });
    expect(r.state.phase).toBe('open');
    expect(r.events[0]).toEqual({ type: 'shopOpened', day: 1 });
    expect(reduce(r.state, { type: 'OPEN_SHOP' }).events[0]).toMatchObject({ type: 'rejected' });
  });

  it('sang ngày mới thì về buổi sáng chuẩn bị', () => {
    const closed = reduce(createShopState(1), { type: 'END_DAY' }).state;
    expect(reduce(closed, { type: 'START_DAY' }).state.phase).toBe('prep');
  });
});

describe('gói nhỏ, gói lớn và nhập gấp', () => {
  it('gói nhỏ ít hơn nhưng đắt hơn mỗi phần', () => {
    const small = packOf(milk, 'small');
    const big = packOf(milk, 'big');
    expect(small.size).toBeLessThan(big.size);
    expect(small.price / small.size).toBeGreaterThan(big.price / big.size);
    const r = reduce(prep(), { type: 'RESTOCK', item: milk, pack: 'small' });
    expect(r.state.stock[milk]).toBe(createShopState(5).stock[milk] + small.size);
    expect(r.state.cash).toBe(createShopState(5).cash - small.price);
  });

  it('nhập gấp lúc đang bán: đắt hơn, hàng tới sau một lúc', () => {
    const open = createShopState(5);
    const r = reduce(open, { type: 'RESTOCK', item: milk, pack: 'small' });
    const morning = restockPrice(prep(open), milk, 'small');
    const price = restockPrice(open, milk, 'small');
    expect(price).toBe(Math.round((morning * RUSH.priceFactor) / 100) * 100);
    expect(r.events[0]).toMatchObject({ type: 'restocked', rush: true });
    expect(r.state.stock[milk]).toBe(open.stock[milk]); // chưa tới
    expect(r.state.incoming).toHaveLength(1);
    expect(r.state.today.rush).toBe(1);
    expect(r.state.today.rushExtra).toBe(price - morning);
    const early = reduce(r.state, { type: 'TICK', dt: RUSH.deliveryMs - 100 });
    expect(early.state.stock[milk]).toBe(open.stock[milk]);
    const later = reduce(early.state, { type: 'TICK', dt: 200 });
    expect(later.state.stock[milk]).toBe(open.stock[milk] + packOf(milk, 'small').size);
    expect(later.state.incoming).toHaveLength(0);
    expect(later.events).toContainEqual({ type: 'delivered', item: milk, amount: packOf(milk, 'small').size });
  });
});

describe('lô hàng và hạn dùng', () => {
  it('dùng lô sắp hết hạn trước, giá vốn theo lô', () => {
    const room = { stock: { x: 5 }, lots: { x: [{ qty: 2, cost: 100, until: 3 }, { qty: 3, cost: 900, until: 1 }] } };
    room.lots.x.sort((a, b) => a.until - b.until);
    const used = consume(room, 'x', 4)!;
    expect(used.cost).toBe(3 * 900 + 1 * 100);
    expect(used.lots.x).toEqual([{ qty: 1, cost: 100, until: 3 }]);
    expect(used.stock.x).toBe(1);
  });

  it('đóng cửa: đồ chỉ dùng trong ngày bị bỏ, đồ để được vài ngày và đồ khô còn lại', () => {
    const pudding = stockIdOfTopping('pudding');
    const base = createShopState(5);
    const s: ShopState = {
      ...base,
      stock: { ...base.stock, [pudding]: 10 },
      lots: { ...base.lots, [pudding]: lotsFromStock({ [pudding]: 10 }, 1)[pudding] },
    };
    const { state, summary } = closeDay(s);
    expect(getStockDef(pudding).shelfLife).toBe(2);
    expect(state.stock[pudding]).toBe(10); // dùng được tới hết ngày 2
    expect(state.stock[milk]).toBe(0); // trà pha trong ngày
    expect(state.stock[STOCK_ICE]).toBe(0); // đá tan
    expect(state.stock[stockIdOfCup('M')]).toBe(base.stock[stockIdOfCup('M')]); // cốc không hỏng
    expect(summary.expired[milk]).toBe(base.stock[milk]);
    expect(summary.expiredCost).toBeGreaterThan(0);
    // Ngày 2 đóng cửa thì pudding cũng hết hạn
    const day2 = closeDay({ ...state, day: 2, phase: 'open', today: emptyDayStats(state.cash) }).state;
    expect(day2.stock[pudding]).toBe(0);
  });

  it('hàng nhập gấp chưa kịp giao thì giao luôn lúc đóng cửa (đã trả tiền)', () => {
    const r = reduce(createShopState(5), { type: 'RESTOCK', item: stockIdOfCup('M'), pack: 'small' });
    const { state } = closeDay(r.state);
    expect(state.incoming).toEqual([]);
    expect(state.stock[stockIdOfCup('M')]).toBe(createShopState(5).stock[stockIdOfCup('M')] + packOf(stockIdOfCup('M'), 'small').size);
  });
});

describe('mua chịu và nợ', () => {
  it('két không đủ thì phần thiếu ghi nợ, két không âm', () => {
    const s: ShopState = { ...prep(), cash: 1000 };
    const price = restockPrice(s, STOCK_ICE, 'small');
    const r = reduce(s, { type: 'RESTOCK', item: STOCK_ICE, pack: 'small' });
    expect(r.state.cash).toBe(0);
    expect(r.state.debt).toBe(price - 1000);
    expect(r.state.today.borrowed).toBe(price - 1000);
  });

  it('vượt hạn mức thì không mua chịu được nữa', () => {
    const s: ShopState = { ...prep(), cash: 0, debt: CREDIT.limit };
    expect(reduce(s, { type: 'RESTOCK', item: STOCK_ICE, pack: 'small' }).events[0]).toMatchObject({ reason: 'noMoney' });
  });

  it('tiền thuê luôn trả được: thiếu thì ghi nợ', () => {
    const { state, summary } = closeDay({ ...createShopState(5), cash: 20_000 });
    expect(state.cash).toBe(0);
    expect(state.debt).toBe(RENT_PER_DAY - 20_000);
    expect(summary.debtEnd).toBe(state.debt);
  });

  it('cuối ngày tự trả nợ bằng phần két vượt mức giữ lại', () => {
    const { state, summary } = closeDay({ ...createShopState(5), cash: 400_000, debt: 100_000 });
    expect(summary.repaid).toBe(100_000);
    expect(state.debt).toBe(0);
    expect(state.cash).toBe(400_000 - RENT_PER_DAY - 100_000);
    const poor = closeDay({ ...createShopState(5), cash: CREDIT.keepCash + RENT_PER_DAY + 10_000, debt: 50_000 });
    expect(poor.summary.repaid).toBe(10_000);
    expect(poor.state.cash).toBe(CREDIT.keepCash);
  });
});

describe('số liệu để ước lượng', () => {
  it('khách vào thì ghi nhu cầu từng nguyên liệu', () => {
    const s = stateWithCustomer();
    const needs = needsOf(SPEC);
    for (const [id, n] of Object.entries(needs)) expect(s.today.demand[id]).toBe(n);
    // matcha M, 50% đường = 2 lần chạm, đá bình thường = 2 muỗng, 1 muỗng trân châu trắng
    expect(needs).toEqual({ 'cup-M': 1, 'tea-matcha': 1, sugar: 2, ice: 2, 'topping-pearl-white': 1 });
  });

  it('khách bỏ đi lúc tiệm hết nguyên liệu món họ gọi → tính là lỡ khách vì hết hàng', () => {
    const base = stateWithCustomer();
    const matcha = stockIdOfTea('matcha');
    const out = { ...base, stock: { ...base.stock, [matcha]: 0 } };
    const r = reduce(out, { type: 'CUSTOMER_LEAVE', customerId: 'k1' });
    expect(r.state.today.lost).toEqual({ [matcha]: 1 });
    expect(r.state.today.lostCustomers).toBe(1);
    expect(r.state.today.lostRevenue).toBe(cupPrice(SPEC));
    // Còn hàng mà khách bỏ đi vì chờ lâu thì không tính
    const slow = reduce(base, { type: 'CUSTOMER_LEAVE', customerId: 'k1' });
    expect(slow.state.today.lostCustomers).toBe(0);
  });

  it('đóng cửa xong, số liệu hôm nay thành "hôm qua" cho buổi sáng hôm sau', () => {
    const { state } = closeDay(stateWithCustomer());
    expect(state.yesterday?.demand).toEqual(needsOf(SPEC));
  });
});

describe('điểm quản lý kho và tiền theo điểm', () => {
  it('trừ điểm khi lỡ khách, khi bỏ đồ, khi nhập gấp', () => {
    const t = emptyDayStats(0);
    expect(stockScoreOf(t)).toBe(100);
    expect(stockScoreOf({ ...t, lostCustomers: 2 })).toBe(100 - 2 * STOCK_SCORING.perLostCustomer);
    expect(stockScoreOf({ ...t, ingredients: 80_000, expiredCost: 20_000 })).toBe(80);
    expect(stockScoreOf({ ...t, rush: 1 })).toBe(100 - STOCK_SCORING.perRush);
    expect(stockScoreOf({ ...t, lostCustomers: 50 })).toBe(0);
  });

  it('người giữ trạm Kho nhận điểm quản lý kho', () => {
    const { summary } = closeDay(createShopState(5), {}, 'kho');
    expect(summary.staff.kho.manage).toBe(summary.stockScore);
  });

  it('ly quá tệ thì khách chỉ trả một phần tiền', () => {
    const r = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'L' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'milk', amount: 0.3 },
      { type: 'SEAL_CUP', cupId: 'cup1' },
      { type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' },
    ]);
    const served = r.events.find((e) => e.type === 'served');
    if (!served || served.type !== 'served') throw new Error('Không thấy served');
    expect(served.score.total).toBeLessThan(SCORING.fullPayFrom);
    expect(served.money).toBe(Math.round((cupPrice(SPEC) * SCORING.lowScorePayShare) / 1000) * 1000);
    expect(r.state.today.revenue).toBe(served.money);
  });
});

describe('lưu kho theo lô', () => {
  it('bản lưu phiên bản 2 (chưa có lô) → lô tạo từ số tồn, không nợ', () => {
    const v3 = createSave(createShopState(9), defaultSettings(), { now: 1 });
    const { lots: _lots, debt: _debt, yesterday: _y, ...oldShop } = v3.shop;
    void _lots;
    void _debt;
    void _y;
    const v2 = { ...v3, schemaVersion: 2, shop: oldShop };
    const save = migrate(JSON.parse(JSON.stringify(v2)));
    expect(save?.shop.debt).toBe(0);
    expect(save?.shop.lots[milk]).toEqual([{ qty: oldShop.stock[milk], cost: unitCost(milk), until: 1 }]);
  });

  it('lô lệch số tồn thì khớp lại theo số tồn', () => {
    const lots = decodeLots({ x: [{ qty: 5, cost: 1, until: 0 }], [milk]: [{ qty: 9, cost: 1, until: 1 }] }, { [milk]: 4 }, 1);
    expect(lots[milk]).toEqual([{ qty: 4, cost: 1, until: 1 }]);
    const fewer = decodeLots({ [milk]: [{ qty: 1, cost: 1, until: 1 }] }, { [milk]: 3 }, 1);
    expect(fewer[milk].reduce((a, l) => a + l.qty, 0)).toBe(3);
    // Lô đã quá hạn trước ngày đang chơi thì bỏ
    const stale = decodeLots({ [milk]: [{ qty: 3, cost: 1, until: 1 }] }, { [milk]: 3 }, 2);
    expect(stale[milk]).toEqual([{ qty: 3, cost: unitCost(milk), until: 2 }]);
  });

  it('lưu lúc có hàng đang giao: mở lại thì hàng đó đã về kho', () => {
    const r = reduce(createShopState(5), { type: 'RESTOCK', item: milk, pack: 'small' });
    const shop = normalizeShop(shopSaveOf(r.state, { ownerUid: '', cloudBase: 0 }, 1));
    expect(shop?.stock[milk]).toBe(createShopState(5).stock[milk] + packOf(milk, 'small').size);
  });
});
