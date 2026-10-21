import { describe, expect, it } from 'vitest';
import {
  START_CASH,
  STOCK_ICE,
  STOCK_SUGAR,
  getStockDef,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
  unitCost,
} from '../src/config/inventory';
import { consume } from '../src/core/inventory';
import { createShopState, reduce } from '../src/core/reducer';
import type { ShopState } from '../src/core/types';
import { run, stateWithCustomer } from './helpers';

describe('inventory', () => {
  it('pha một ly trừ kho đúng: 1 cốc, 1 trà, mỗi lần chạm đường/đá/topping trừ 1', () => {
    const start = stateWithCustomer();
    const { state } = run(start, [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: 0.3 },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: 0.4 }, // rót tiếp không trừ thêm trà
      { type: 'TAP_SYRUP', cupId: 'cup1' },
      { type: 'TAP_SYRUP', cupId: 'cup1' },
      { type: 'SCOOP_ICE', cupId: 'cup1' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'jelly' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'jelly' },
    ]);
    const diff = (id: string) => start.stock[id] - state.stock[id];
    expect(diff(stockIdOfCup('M'))).toBe(1);
    expect(diff(stockIdOfCup('L'))).toBe(0);
    expect(diff(stockIdOfTea('matcha'))).toBe(1);
    expect(diff(STOCK_SUGAR)).toBe(2);
    expect(diff(STOCK_ICE)).toBe(1);
    expect(diff(stockIdOfTopping('jelly'))).toBe(2);
    // Giá vốn của ly = tổng giá các nguyên liệu đã dùng
    const expected =
      unitCost(stockIdOfCup('M')) +
      unitCost(stockIdOfTea('matcha')) +
      2 * unitCost(STOCK_SUGAR) +
      unitCost(STOCK_ICE) +
      2 * unitCost(stockIdOfTopping('jelly'));
    expect(state.cups[0].cost).toBeCloseTo(expected);
  });

  it('thao tác bị chặn (đường quá 100%) thì không trừ kho', () => {
    const { state } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'M' },
      ...Array.from({ length: 6 }, () => ({ type: 'TAP_SYRUP' as const, cupId: 'cup1' })),
    ]);
    expect(createShopState(1).stock[STOCK_SUGAR] - state.stock[STOCK_SUGAR]).toBe(4);
  });

  it('hết hàng thì bị từ chối và kho không bao giờ âm', () => {
    let state: ShopState = { ...createShopState(1), stock: { ...createShopState(1).stock, [stockIdOfCup('L')]: 0 } };
    const r = reduce(state, { type: 'PICK_CUP', size: 'L' });
    expect(r.events[0]).toEqual({ type: 'rejected', action: 'PICK_CUP', reason: 'outOfStock' });
    expect(r.state.stock[stockIdOfCup('L')]).toBe(0);

    state = { ...state, stock: { ...state.stock, [stockIdOfTopping('jelly')]: 1 } };
    const after = run(state, [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'jelly' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'jelly' },
    ]);
    expect(after.state.stock[stockIdOfTopping('jelly')]).toBe(0);
    expect(after.events.at(-1)).toEqual({ type: 'rejected', action: 'ADD_TOPPING', reason: 'outOfStock' });
    expect(consume({ a: 0 }, 'a')).toBeNull();
  });

  it('hết trà thì không rót được vào ly rỗng', () => {
    const base = createShopState(1);
    const state = { ...base, stock: { ...base.stock, [stockIdOfTea('milk')]: 0 } };
    const { events } = run(state, [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'milk', amount: 0.5 },
    ]);
    expect(events.at(-1)).toEqual({ type: 'rejected', action: 'POUR_TEA', reason: 'outOfStock' });
  });

  it('nhập hàng: trừ két, cộng tồn, ghi chi phí nhập hàng', () => {
    const def = getStockDef(stockIdOfCup('M'));
    const start = createShopState(1);
    const { state, events } = run(start, [{ type: 'RESTOCK', item: def.id }]);
    expect(state.cash).toBe(START_CASH - def.packPrice);
    expect(state.stock[def.id]).toBe(start.stock[def.id] + def.packSize);
    expect(state.today.restock).toBe(def.packPrice);
    expect(events[0]).toEqual({ type: 'restocked', item: def.id, amount: def.packSize, price: def.packPrice });
  });

  it('không đủ tiền thì không nhập được', () => {
    const state = { ...createShopState(1), cash: 1000 };
    const r = reduce(state, { type: 'RESTOCK', item: stockIdOfCup('M') });
    expect(r.events[0]).toEqual({ type: 'rejected', action: 'RESTOCK', reason: 'noMoney' });
    expect(r.state).toBe(state);
  });

  it('mở khóa topping: trừ két, dùng được ngay, có sẵn một gói', () => {
    const start = { ...createShopState(1), day: 2 };
    const { state, events } = run(start, [
      { type: 'UNLOCK_ITEM', kind: 'topping', id: 'pudding' },
      { type: 'PICK_CUP', size: 'M' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'pudding' },
    ]);
    expect(events[0]).toEqual({ type: 'unlocked', kind: 'topping', id: 'pudding' });
    expect(state.unlockedToppings).toContain('pudding');
    expect(state.cash).toBe(START_CASH - 150_000);
    expect(state.today.unlock).toBe(150_000);
    expect(state.cups[0].toppings).toEqual([{ id: 'pudding', scoops: 1 }]);
    expect(state.stock[stockIdOfTopping('pudding')]).toBe(getStockDef(stockIdOfTopping('pudding')).packSize - 1);
  });

  it('mở khóa bị chặn: chưa tới ngày, thiếu tiền, đã mở rồi', () => {
    const day1 = createShopState(1);
    expect(reduce(day1, { type: 'UNLOCK_ITEM', kind: 'topping', id: 'pudding' }).events[0]).toMatchObject({ reason: 'tooEarly' });
    const poor = { ...day1, day: 5, cash: 10 };
    expect(reduce(poor, { type: 'UNLOCK_ITEM', kind: 'tea', id: 'green' }).events[0]).toMatchObject({ reason: 'noMoney' });
    expect(reduce(day1, { type: 'UNLOCK_ITEM', kind: 'tea', id: 'milk' }).events[0]).toMatchObject({ reason: 'unknown' });
    const opened = run({ ...day1, day: 2 }, [
      { type: 'UNLOCK_ITEM', kind: 'tea', id: 'green' },
      { type: 'UNLOCK_ITEM', kind: 'tea', id: 'green' },
    ]);
    expect(opened.events[1]).toMatchObject({ reason: 'alreadyUnlocked' });
  });

  it('bỏ ly vào thùng rác: giá vốn của ly tính vào hao phí', () => {
    const { state } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'L' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'milk', amount: 1.3 },
      { type: 'DISCARD_CUP', cupId: 'cup1' },
    ]);
    expect(state.today.wasteCups).toBe(1);
    expect(state.today.waste).toBeCloseTo(unitCost(stockIdOfCup('L')) + unitCost(stockIdOfTea('milk')));
  });
});
