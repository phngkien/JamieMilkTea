import { createShopState, reduce } from '../src/core/reducer';
import type { Action, CupSpec, Customer, ShopState } from '../src/core/types';

/** Áp dụng lần lượt nhiều action, trả state cuối và toàn bộ sự kiện. */
export function run(state: ShopState, actions: Action[]) {
  const events = [];
  for (const action of actions) {
    const result = reduce(state, action);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

export function makeCustomer(spec: CupSpec, overrides: Partial<Customer> = {}): Customer {
  return {
    id: 'k1',
    name: 'Khách thử',
    look: 0,
    lineVariant: 0,
    order: { id: 'o1', cups: [spec], served: [null] },
    patience: 1,
    drainPerSecond: 1 / 60,
    arrivedAt: 0,
    ...overrides,
  };
}

export const SPEC: CupSpec = {
  size: 'M',
  tea: 'matcha',
  sugar: 50,
  ice: 'normal',
  toppings: [{ id: 'pearl-white', scoops: 1 }],
};

export function stateWithCustomer(spec: CupSpec = SPEC, overrides: Partial<Customer> = {}): ShopState {
  const state = createShopState(42);
  return reduce(state, { type: 'CUSTOMER_ARRIVE', customer: makeCustomer(spec, overrides) }).state;
}
