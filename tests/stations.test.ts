import { describe, expect, it } from 'vitest';
import { createShopState, reduce } from '../src/core/reducer';
import {
  canPerform,
  nextStationFor,
  soloOwners,
  stationOwners,
  stationsOf,
  type StationPlayer,
} from '../src/core/stations';
import type { ShopState } from '../src/core/types';
import { decodeState, encodeState } from '../src/net/serialize';
import { run, stateWithCustomer } from './helpers';

const p = (uid: string, station: StationPlayer['station'], joinedAt: number): StationPlayer => ({ uid, station, joinedAt });

describe('gộp trạm theo số người (CLAUDE.md mục 11)', () => {
  it('1 người làm cả 4 trạm', () => {
    const o = stationOwners([p('a', 'tea', 1)]);
    expect(stationsOf(o, 'a').sort()).toEqual(['cashier', 'stock', 'tea', 'topping']);
  });

  it('2 người: Thu ngân + Kho / Quầy trà + Kệ topping', () => {
    const o = stationOwners([p('a', 'cashier', 1), p('b', 'tea', 2)]);
    expect(stationsOf(o, 'a').sort()).toEqual(['cashier', 'stock']);
    expect(stationsOf(o, 'b').sort()).toEqual(['tea', 'topping']);
  });

  it('3 người: Thu ngân + Kho / Quầy trà / Kệ topping', () => {
    const o = stationOwners([p('a', 'cashier', 1), p('b', 'tea', 2), p('c', 'topping', 3)]);
    expect(stationsOf(o, 'a').sort()).toEqual(['cashier', 'stock']);
    expect(stationsOf(o, 'b')).toEqual(['tea']);
    expect(stationsOf(o, 'c')).toEqual(['topping']);
  });

  it('4 người: mỗi người một trạm; chọn trùng thì người vào trước giữ', () => {
    const o = stationOwners([p('a', 'cashier', 1), p('b', 'tea', 2), p('c', 'topping', 3), p('d', 'stock', 4)]);
    expect(o).toEqual({ cashier: 'a', tea: 'b', topping: 'c', stock: 'd' });
    const dup = stationOwners([p('a', 'tea', 5), p('b', 'tea', 2)]);
    expect(dup.tea).toBe('b');
  });

  it('người chưa chọn trạm không giữ gì; chưa ai chọn thì chủ phòng giữ hết', () => {
    const o = stationOwners([p('a', null, 1), p('b', 'tea', 2)]);
    expect(stationsOf(o, 'a')).toEqual([]);
    expect(stationOwners([p('a', null, 1)], 'a')).toEqual(soloOwners('a'));
  });
});

describe('quyền thao tác', () => {
  const owners = stationOwners([p('thu', 'cashier', 1), p('tra', 'tea', 2), p('top', 'topping', 3)]);
  const multi = (s: ShopState): ShopState => ({ ...s, solo: false });

  it('ai đúng trạm mới được làm', () => {
    const s = multi(createShopState(1));
    expect(canPerform(s, owners, 'tra', { type: 'PICK_CUP', size: 'M' }, false)).toBeNull();
    expect(canPerform(s, owners, 'top', { type: 'PICK_CUP', size: 'M' }, false)).toBe('notYourStation');
    expect(canPerform(s, owners, 'thu', { type: 'RESTOCK', item: 'ice' }, false)).toBeNull(); // Kho gộp vào Thu ngân
    expect(canPerform(s, owners, 'tra', { type: 'TICK', dt: 10 }, false)).toBe('notYourStation');
    expect(canPerform(s, owners, 'tra', { type: 'TICK', dt: 10 }, true)).toBeNull();
  });

  it('ly đang ở trạm người khác thì chỉ xem, không sửa được', () => {
    const s = run(multi(stateWithCustomer()), [{ type: 'PICK_CUP', size: 'M' }]).state;
    expect(canPerform(s, owners, 'top', { type: 'TAP_SYRUP', cupId: 'cup1' }, false)).toBe('notYourStation');
    const passed = reduce(s, { type: 'PASS_CUP', cupId: 'cup1', to: 'topping' }).state;
    expect(canPerform(passed, owners, 'top', { type: 'TAP_SYRUP', cupId: 'cup1' }, false)).toBeNull();
    expect(canPerform(passed, owners, 'tra', { type: 'POUR_TEA', cupId: 'cup1', tea: 'milk', amount: 0.1 }, false)).toBe(
      'notYourStation',
    );
  });

  it('chuyền ly: bỏ qua trạm mình cũng giữ', () => {
    const two = stationOwners([p('a', 'cashier', 1), p('b', 'tea', 2)]);
    expect(nextStationFor(two, 'b', 'tea')).toBe('cashier'); // b giữ cả topping nên chuyền thẳng tới Thu ngân
    expect(nextStationFor(owners, 'tra', 'tea')).toBe('topping');
    expect(nextStationFor(soloOwners('x'), 'x', 'tea')).toBeNull();
  });
});

describe('reducer: nhiều ly, chuyền ly', () => {
  it('mỗi trạm tối đa một ly; chuyền xuôi rồi lấy cốc mới được', () => {
    let s: ShopState = { ...stateWithCustomer(), solo: false };
    s = reduce(s, { type: 'PICK_CUP', size: 'M' }).state;
    expect(s.cups[0].station).toBe('tea');
    expect(s.cups[0].forCustomer).toBe('k1');
    expect(reduce(s, { type: 'PICK_CUP', size: 'L' }).events[0]).toMatchObject({ reason: 'stationBusy' });
    const passed = reduce(s, { type: 'PASS_CUP', cupId: 'cup1', to: 'topping' });
    expect(passed.events[0]).toEqual({ type: 'cupPassed', cupId: 'cup1', to: 'topping' });
    s = reduce(passed.state, { type: 'PICK_CUP', size: 'L' }).state;
    expect(s.cups.map((c) => c.station)).toEqual(['topping', 'tea']);
    // Không chuyền ngược, không chuyền vào trạm đang có ly
    expect(reduce(s, { type: 'PASS_CUP', cupId: 'cup1', to: 'tea' }).events[0]).toMatchObject({ type: 'rejected' });
    expect(reduce(s, { type: 'PASS_CUP', cupId: 'cup2', to: 'topping' }).events[0]).toMatchObject({ reason: 'stationBusy' });
  });

  it('chơi một mình vẫn chỉ một ly', () => {
    const s = run(createShopState(1), [{ type: 'PICK_CUP', size: 'M' }, { type: 'PICK_CUP', size: 'M' }]);
    expect(s.events.at(-1)).toMatchObject({ reason: 'boardFull' });
  });
});

describe('nén state gửi qua Firebase', () => {
  it('mã hóa rồi giải mã giữ nguyên state (trừ lịch sử)', () => {
    let s: ShopState = { ...stateWithCustomer(), solo: false };
    s = run(s, [{ type: 'PICK_CUP', size: 'L' }]).state;
    const decoded = decodeState(JSON.parse(JSON.stringify(encodeState(s))), s.history);
    expect(decoded).toEqual(s);
  });

  it('chịu được dữ liệu Firebase làm mất null / mảng rỗng', () => {
    const s: ShopState = { ...stateWithCustomer(), solo: false };
    const raw = encodeState(s) as Record<string, unknown>;
    // Giả lập Firebase: bỏ mảng rỗng và trường null
    delete raw.cups;
    const customers = raw.customers as Record<string, unknown>[];
    delete (customers[0].order as Record<string, unknown>).served;
    const decoded = decodeState(raw)!;
    expect(decoded.cups).toEqual([]);
    expect(decoded.customers[0].order.served).toEqual([null]);
    expect(decodeState(null)).toBeNull();
  });
});
