// Reducer: (state, action) → state mới + danh sách sự kiện. Mọi thay đổi trạng thái đi qua đây.
import { BOARD_SLOTS } from '../config/cup';
import { QUEUE_PATIENCE_FACTOR, getDayConfig } from '../config/progression';
import { SCORING } from '../config/scoring';
import { STARTING_TEAS } from '../config/teas';
import { STARTING_TOPPINGS } from '../config/toppings';
import {
  addTopping,
  createCup,
  pourTea,
  scoopIce,
  sealCup,
  tapSyrup,
  type BrewResult,
} from './brewing';
import { cupPrice } from './economy';
import { arrivalGap } from './orders';
import { scoreCup, starsFromScore } from './scoring';
import type { Action, CupState, Customer, GameEvent, ReduceResult, RejectReason, ShopState } from './types';

export function createShopState(seed: number, day = 1): ShopState {
  return {
    day,
    seed,
    time: 0,
    cash: 0,
    ratingSum: 0,
    ratingCount: 0,
    servedCount: 0,
    unhappyCount: 0,
    customers: [],
    cups: [],
    nextCustomerIndex: 0,
    nextArrivalAt: getDayConfig(day).firstArrivalMs,
    nextCupNumber: 1,
    unlockedTeas: [...STARTING_TEAS],
    unlockedToppings: [...STARTING_TOPPINGS],
  };
}

function reject(state: ShopState, action: Action, reason: RejectReason): ReduceResult {
  return { state, events: [{ type: 'rejected', action: action.type, reason }] };
}

function replaceCup(state: ShopState, cup: CupState): ShopState {
  return { ...state, cups: state.cups.map((c) => (c.id === cup.id ? cup : c)) };
}

/** Áp dụng một thao tác pha chế lên ly có id `cupId`. */
function brew(
  state: ShopState,
  action: Action,
  cupId: string,
  op: (cup: CupState) => BrewResult,
  onOk: (cup: CupState) => GameEvent[],
): ReduceResult {
  const cup = state.cups.find((c) => c.id === cupId);
  if (!cup) return reject(state, action, 'noCup');
  const result = op(cup);
  if (!result.ok) return reject(state, action, result.reason);
  return { state: replaceCup(state, result.cup), events: onOk(result.cup) };
}

/** Khách rời tiệm: ghi đánh giá. Bỏ đi vì chờ lâu thì tính là khách không vui. */
function removeCustomer(state: ShopState, customer: Customer, reason: 'done' | 'impatient'): ReduceResult {
  let stars: number = SCORING.leaveStars;
  let unhappy = true;
  if (reason === 'done') {
    const scores = customer.order.served.map((s) => s ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    stars = starsFromScore(avg);
    unhappy = avg < SCORING.unhappyBelow;
  }
  return {
    state: {
      ...state,
      customers: state.customers.filter((c) => c.id !== customer.id),
      ratingSum: state.ratingSum + stars,
      ratingCount: state.ratingCount + 1,
      unhappyCount: state.unhappyCount + (unhappy ? 1 : 0),
    },
    events: [{ type: 'customerLeft', customerId: customer.id, name: customer.name, reason, stars }],
  };
}

function serveCup(state: ShopState, action: Action & { type: 'SERVE_CUP' }): ReduceResult {
  const cup = state.cups.find((c) => c.id === action.cupId);
  if (!cup) return reject(state, action, 'noCup');
  if (cup.ruined) return reject(state, action, 'ruined');
  if (!cup.sealed) return reject(state, action, 'notSealed');
  const customer = state.customers.find((c) => c.id === action.customerId);
  if (!customer) return reject(state, action, 'noCustomer');

  // Ghép ly vào ly chưa giao trong order sao cho điểm cao nhất (khách nhiều ly).
  let bestIndex = -1;
  let best = null as ReturnType<typeof scoreCup> | null;
  customer.order.cups.forEach((spec, i) => {
    if (customer.order.served[i] !== null) return;
    const s = scoreCup(spec, cup, customer.patience);
    if (!best || s.total > best.total) {
      best = s;
      bestIndex = i;
    }
  });
  if (!best || bestIndex < 0) return reject(state, action, 'noCustomer');
  const score: ReturnType<typeof scoreCup> = best;

  const money = cupPrice(customer.order.cups[bestIndex]);
  const served = customer.order.served.map((s, i) => (i === bestIndex ? score.total : s));
  const updatedCustomer: Customer = { ...customer, order: { ...customer.order, served } };
  const orderComplete = served.every((s) => s !== null);

  let next: ShopState = {
    ...state,
    cups: state.cups.filter((c) => c.id !== cup.id),
    customers: state.customers.map((c) => (c.id === customer.id ? updatedCustomer : c)),
    cash: state.cash + money,
    servedCount: state.servedCount + 1,
  };
  const events: GameEvent[] = [
    { type: 'served', cupId: cup.id, customerId: customer.id, score, money, orderComplete },
  ];
  if (orderComplete) {
    const left = removeCustomer(next, updatedCustomer, 'done');
    next = left.state;
    events.push(...left.events);
  }
  return { state: next, events };
}

function tick(state: ShopState, dt: number): ReduceResult {
  const seconds = dt / 1000;
  let next: ShopState = {
    ...state,
    time: state.time + dt,
    // Khách ở quầy (vị trí 0) mất kiên nhẫn nhanh nhất, người trong hàng chờ chậm hơn.
    customers: state.customers.map((c, i) => ({
      ...c,
      patience: Math.max(0, c.patience - c.drainPerSecond * seconds * (i === 0 ? 1 : QUEUE_PATIENCE_FACTOR)),
    })),
  };
  const events: GameEvent[] = [];
  for (const customer of next.customers.filter((c) => c.patience <= 0)) {
    const left = removeCustomer(next, customer, 'impatient');
    next = left.state;
    events.push(...left.events);
  }
  return { state: next, events };
}

export function reduce(state: ShopState, action: Action): ReduceResult {
  switch (action.type) {
    case 'PICK_CUP': {
      if (state.cups.length >= BOARD_SLOTS) return reject(state, action, 'boardFull');
      const cup = createCup(`cup${state.nextCupNumber}`, action.size);
      return {
        state: { ...state, cups: [...state.cups, cup], nextCupNumber: state.nextCupNumber + 1 },
        events: [{ type: 'cupPicked', cupId: cup.id }],
      };
    }
    case 'POUR_TEA':
      if (!state.unlockedTeas.includes(action.tea)) return reject(state, action, 'locked');
      return brew(state, action, action.cupId, (c) => pourTea(c, action.tea, action.amount), (c) =>
        c.ruined ? [{ type: 'cupRuined', cupId: c.id }] : [{ type: 'poured', cupId: c.id }],
      );
    case 'TAP_SYRUP':
      return brew(state, action, action.cupId, tapSyrup, (c) => [{ type: 'syrupTapped', cupId: c.id }]);
    case 'SCOOP_ICE':
      return brew(state, action, action.cupId, scoopIce, (c) => [{ type: 'iceScooped', cupId: c.id }]);
    case 'ADD_TOPPING':
      if (!state.unlockedToppings.includes(action.topping)) return reject(state, action, 'locked');
      return brew(state, action, action.cupId, (c) => addTopping(c, action.topping), (c) => [
        { type: 'toppingAdded', cupId: c.id, topping: action.topping },
      ]);
    case 'SEAL_CUP':
      return brew(state, action, action.cupId, sealCup, (c) => [{ type: 'cupSealed', cupId: c.id }]);
    case 'SERVE_CUP':
      return serveCup(state, action);
    case 'DISCARD_CUP': {
      if (!state.cups.some((c) => c.id === action.cupId)) return reject(state, action, 'noCup');
      return {
        state: { ...state, cups: state.cups.filter((c) => c.id !== action.cupId) },
        events: [{ type: 'cupDiscarded', cupId: action.cupId }],
      };
    }
    case 'CUSTOMER_ARRIVE':
      return {
        state: {
          ...state,
          customers: [...state.customers, action.customer],
          nextCustomerIndex: state.nextCustomerIndex + 1,
          nextArrivalAt: state.time + arrivalGap(state.seed, state.nextCustomerIndex, state.day),
        },
        events: [{ type: 'customerArrived', customerId: action.customer.id }],
      };
    case 'CUSTOMER_LEAVE': {
      const customer = state.customers.find((c) => c.id === action.customerId);
      if (!customer) return reject(state, action, 'noCustomer');
      return removeCustomer(state, customer, 'impatient');
    }
    case 'TICK':
      return tick(state, action.dt);
  }
}
