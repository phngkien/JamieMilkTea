import { describe, expect, it } from 'vitest';
import { SIZES } from '../src/config/cup';
import { START_CASH } from '../src/config/inventory';
import { createShopState, reduce } from '../src/core/reducer';
import { run, stateWithCustomer } from './helpers';

const fillM = (SIZES.M.greenMin + SIZES.M.greenMax) / 2;

describe('reducer', () => {
  it('pha đúng một ly từ đầu đến cuối: được điểm, tiền, khách rời đi', () => {
    const { state, events } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: fillM },
      { type: 'TAP_SYRUP', cupId: 'cup1' },
      { type: 'TAP_SYRUP', cupId: 'cup1' },
      { type: 'SCOOP_ICE', cupId: 'cup1' },
      { type: 'SCOOP_ICE', cupId: 'cup1' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'pearl-white' },
      { type: 'SEAL_CUP', cupId: 'cup1' },
      { type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' },
    ]);
    const served = events.find((e) => e.type === 'served');
    expect(served && served.type === 'served' && served.score.total).toBe(100);
    expect(state.cash).toBe(START_CASH + 30000 + 8000); // matcha 30k + trân châu trắng 8k
    expect(state.today.revenue).toBe(38000);
    expect(state.today.cupsServed).toBe(1);
    expect(state.today.customersServed).toBe(1);
    expect(state.customers).toHaveLength(0);
    expect(state.cups).toHaveLength(0);
    expect(state.ratingCount).toBe(1);
    expect(state.ratingSum).toBe(5);
    expect(state.today.unhappy).toBe(0);
    expect(events.some((e) => e.type === 'customerLeft' && e.reason === 'done')).toBe(true);
  });

  it('pha sai size thì điểm thấp (≤ 40) và khách không vui', () => {
    const { state, events } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'L' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: 0.8 },
      { type: 'SEAL_CUP', cupId: 'cup1' },
      { type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' },
    ]);
    const served = events.find((e) => e.type === 'served');
    expect(served && served.type === 'served' && served.score.total).toBeLessThanOrEqual(40);
    expect(state.today.unhappy).toBe(1);
  });

  it('rót tràn thì ly hỏng, không giao được, bỏ vào thùng rác được', () => {
    const { state, events } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: 1.2 },
      { type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' },
    ]);
    expect(events.some((e) => e.type === 'cupRuined')).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'rejected', action: 'SERVE_CUP', reason: 'ruined' });
    const after = reduce(state, { type: 'DISCARD_CUP', cupId: 'cup1' });
    expect(after.state.cups).toHaveLength(0);
    expect(after.events[0].type).toBe('cupDiscarded');
  });

  it('chạm đường quá 4 lần bị chặn', () => {
    const { state, events } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'M' },
      ...Array.from({ length: 5 }, () => ({ type: 'TAP_SYRUP' as const, cupId: 'cup1' })),
    ]);
    expect(state.cups[0].sugarTaps).toBe(4);
    expect(events.at(-1)).toEqual({ type: 'rejected', action: 'TAP_SYRUP', reason: 'sugarMax' });
  });

  it('phải ép nắp trước khi giao', () => {
    const { events } = run(stateWithCustomer(), [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'matcha', amount: fillM },
      { type: 'SERVE_CUP', cupId: 'cup1', customerId: 'k1' },
    ]);
    expect(events.at(-1)).toEqual({ type: 'rejected', action: 'SERVE_CUP', reason: 'notSealed' });
  });

  it('bảng gỗ chỉ đặt được một ly', () => {
    const { events } = run(createShopState(1), [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'PICK_CUP', size: 'L' },
    ]);
    expect(events.at(-1)).toEqual({ type: 'rejected', action: 'PICK_CUP', reason: 'boardFull' });
  });

  it('topping hoặc trà bị khóa thì bị từ chối', () => {
    const { events } = run(createShopState(1), [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'ADD_TOPPING', cupId: 'cup1', topping: 'pudding' },
      { type: 'POUR_TEA', cupId: 'cup1', tea: 'oolong', amount: 0.5 },
    ]);
    expect(events.filter((e) => e.type === 'rejected' && e.reason === 'locked')).toHaveLength(2);
  });

  it('kiên nhẫn về 0 thì khách bỏ đi, bị tính là khách không vui', () => {
    // drainPerSecond = 1/60 → 60 giây là hết kiên nhẫn
    let state = stateWithCustomer();
    let result = reduce(state, { type: 'TICK', dt: 30_000 });
    expect(result.state.customers[0].patience).toBeCloseTo(0.5);
    state = result.state;
    result = reduce(state, { type: 'TICK', dt: 31_000 });
    expect(result.state.customers).toHaveLength(0);
    expect(result.state.today.unhappy).toBe(1);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: 'customerLeft', reason: 'impatient' }),
    );
  });

  it('khách trong hàng chờ mất kiên nhẫn chậm hơn khách ở quầy', () => {
    let state = stateWithCustomer();
    state = reduce(state, {
      type: 'CUSTOMER_ARRIVE',
      customer: { ...state.customers[0], id: 'k2' },
    }).state;
    state = reduce(state, { type: 'TICK', dt: 30_000 }).state;
    expect(state.customers[0].patience).toBeCloseTo(0.5);
    expect(state.customers[1].patience).toBeCloseTo(0.75);
  });

  it('khách tự rời bằng CUSTOMER_LEAVE', () => {
    const { state } = run(stateWithCustomer(), [{ type: 'CUSTOMER_LEAVE', customerId: 'k1' }]);
    expect(state.customers).toHaveLength(0);
  });

  it('reducer không sửa state cũ', () => {
    const before = stateWithCustomer();
    const snapshot = JSON.stringify(before);
    run(before, [
      { type: 'PICK_CUP', size: 'M' },
      { type: 'TICK', dt: 1000 },
    ]);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

});
