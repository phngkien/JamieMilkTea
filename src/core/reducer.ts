// Reducer: (state, action) → state mới + danh sách sự kiện. Mọi thay đổi trạng thái đi qua đây.
import { BOARD_SLOTS } from '../config/cup';
import {
  START_CASH,
  STOCK_ICE,
  STOCK_SUGAR,
  startingStock,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
  getStockDef,
} from '../config/inventory';
import { DAY_LENGTH_MS, QUEUE_PATIENCE_FACTOR, getDayConfig } from '../config/progression';
import { SCORING } from '../config/scoring';
import { SHOP_NAME, SHOP_NAME_MAX } from '../config/strings';
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
import { arrivalGap, closeDay, customersForDay, emptyDayStats, startDay } from './day';
import { creditCup, cupPrice, splitTip, tipForCup } from './economy';
import { buyUpgrade, consume, restock, restockPrice, unlockItem, type InventoryResult } from './inventory';
import { scoreCup, starsFromScore, stationScores } from './scoring';
import { CUP_CHAIN } from './stations';
import type {
  Action,
  CupState,
  CupStation,
  Customer,
  GameEvent,
  ReduceResult,
  RejectReason,
  ShopState,
} from './types';
import { upgradeEffects } from './upgrades';

/** Tiệm mới tinh khi bắt đầu chơi. */
export function createShopState(seed: number, day = 1, runId = ''): ShopState {
  return {
    solo: true,
    day,
    seed,
    phase: 'open',
    time: 0,
    cash: START_CASH,
    stock: startingStock(),
    ratingSum: 0,
    ratingCount: 0,
    today: emptyDayStats(START_CASH),
    customersToday: customersForDay(day, 0, 0),
    history: [],
    customers: [],
    cups: [],
    nextCustomerIndex: 0,
    nextArrivalAt: getDayConfig(day).firstArrivalMs,
    nextCupNumber: 1,
    unlockedTeas: [...STARTING_TEAS],
    unlockedToppings: [...STARTING_TOPPINGS],
    shopName: SHOP_NAME,
    upgrades: [],
    decor: [],
    runId,
  };
}

function reject(state: ShopState, action: Action, reason: RejectReason): ReduceResult {
  return { state, events: [{ type: 'rejected', action: action.type, reason }] };
}

function replaceCup(state: ShopState, cup: CupState): ShopState {
  return { ...state, cups: state.cups.map((c) => (c.id === cup.id ? cup : c)) };
}

/**
 * Áp dụng một thao tác pha chế lên ly `cupId`.
 * Nếu có `stockId`: kiểm tra còn hàng trước, chỉ trừ kho khi thao tác thành công.
 */
function brew(
  state: ShopState,
  action: Action,
  cupId: string,
  op: (cup: CupState) => BrewResult,
  onOk: (cup: CupState) => GameEvent[],
  stockId?: string,
): ReduceResult {
  const cup = state.cups.find((c) => c.id === cupId);
  if (!cup) return reject(state, action, 'noCup');
  if (stockId && (state.stock[stockId] ?? 0) <= 0) return reject(state, action, 'outOfStock');
  const result = op(cup);
  if (!result.ok) return reject(state, action, result.reason);
  let next = result.cup;
  let stock = state.stock;
  if (stockId) {
    const used = consume(stock, stockId);
    if (!used) return reject(state, action, 'outOfStock');
    stock = used.stock;
    next = { ...next, cost: next.cost + used.cost };
  }
  return { state: replaceCup({ ...state, stock }, next), events: onOk(next) };
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
  const t = state.today;
  return {
    state: {
      ...state,
      customers: state.customers.filter((c) => c.id !== customer.id),
      ratingSum: state.ratingSum + stars,
      ratingCount: state.ratingCount + 1,
      today: {
        ...t,
        customersServed: t.customersServed + (reason === 'done' ? 1 : 0),
        unhappy: t.unhappy + (unhappy ? 1 : 0),
        ratingSum: t.ratingSum + stars,
        ratingCount: t.ratingCount + 1,
      },
    },
    events: [{ type: 'customerLeft', customerId: customer.id, name: customer.name, reason, stars }],
  };
}

function serveCup(state: ShopState, action: Action & { type: 'SERVE_CUP' }, actor: string | null): ReduceResult {
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

  // Khách trả theo món mình gọi
  const spec = customer.order.cups[bestIndex];
  const money = cupPrice(spec);
  // Tip vào tiền cá nhân của những người làm ly, chia theo điểm trạm (không vào két)
  const makers = actor ? { ...cup.makers, cashier: actor } : cup.makers;
  const perStation = stationScores(spec, cup, customer.id, customer.patience);
  const tip = tipForCup(money, score.total, upgradeEffects(state.upgrades).tipFactor);
  const tips = splitTip(
    tip,
    (Object.keys(makers) as CupStation[]).flatMap((s) => (makers[s] ? [{ uid: makers[s], score: perStation[s] }] : [])),
  );
  const served = customer.order.served.map((s, i) => (i === bestIndex ? score.total : s));
  const updatedCustomer: Customer = { ...customer, order: { ...customer.order, served } };
  const orderComplete = served.every((s) => s !== null);

  let next: ShopState = {
    ...state,
    cups: state.cups.filter((c) => c.id !== cup.id),
    customers: state.customers.map((c) => (c.id === customer.id ? updatedCustomer : c)),
    cash: state.cash + money,
    today: {
      ...state.today,
      cupsServed: state.today.cupsServed + 1,
      revenue: state.today.revenue + money,
      ingredients: state.today.ingredients + cup.cost,
      staff: creditCup(state.today.staff, makers, perStation, tips),
    },
  };
  const events: GameEvent[] = [
    { type: 'served', cupId: cup.id, customerId: customer.id, score, money, orderComplete, tip, tips },
  ];
  if (orderComplete) {
    const left = removeCustomer(next, updatedCustomer, 'done');
    next = left.state;
    events.push(...left.events);
  }
  return { state: next, events };
}

function tick(state: ShopState, dt: number): ReduceResult {
  if (state.phase === 'closed') return { state, events: [] };
  const seconds = dt / 1000;
  const time = state.time + dt;
  let next: ShopState = {
    ...state,
    time,
    // Hết giờ: ngừng nhận khách mới, phục vụ nốt khách còn lại
    phase: time >= DAY_LENGTH_MS ? 'closing' : state.phase,
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

function inventoryResult(state: ShopState, action: Action, result: InventoryResult, event: GameEvent): ReduceResult {
  if (!result.ok) return reject(state, action, result.reason);
  return { state: result.state, events: [event] };
}

/** Các thao tác pha chế / phục vụ chỉ làm được khi tiệm chưa đóng cửa. */
const NEEDS_OPEN_SHOP = new Set<Action['type']>([
  'PICK_CUP',
  'POUR_TEA',
  'TAP_SYRUP',
  'SCOOP_ICE',
  'ADD_TOPPING',
  'SEAL_CUP',
  'SERVE_CUP',
  'DISCARD_CUP',
  'PASS_CUP',
  'CUSTOMER_ARRIVE',
]);

/** Thao tác trên ly thì ghi công cho trạm nào (null = không ghi). */
function makerStation(state: ShopState, action: Action): CupStation | null {
  switch (action.type) {
    case 'POUR_TEA':
      return 'tea';
    case 'TAP_SYRUP':
    case 'SCOOP_ICE':
    case 'ADD_TOPPING':
      return 'topping';
    case 'SEAL_CUP':
      return 'cashier';
    case 'PASS_CUP':
      // Chuyền ly đi cũng là đã làm xong phần của trạm đang giữ ly
      return state.cups.find((c) => c.id === action.cupId)?.station ?? null;
    default:
      return null;
  }
}

/**
 * Áp dụng một thao tác. `actor` là uid người làm (chơi đơn: 'me'; null = việc của hệ thống,
 * ví dụ thời gian trôi). Thao tác trên ly thì ghi lại ai đã làm ở trạm nào để chấm điểm cá nhân.
 */
export function reduce(state: ShopState, action: Action, actor: string | null = null): ReduceResult {
  const result = applyAction(state, action, actor);
  if (!actor || !('cupId' in action) || result.events.some((e) => e.type === 'rejected')) return result;
  const station = makerStation(state, action);
  const cup = result.state.cups.find((c) => c.id === action.cupId);
  if (!station || !cup || cup.makers[station] === actor) return result;
  return { ...result, state: replaceCup(result.state, { ...cup, makers: { ...cup.makers, [station]: actor } }) };
}

function applyAction(state: ShopState, action: Action, actor: string | null): ReduceResult {
  if (state.phase === 'closed' && NEEDS_OPEN_SHOP.has(action.type)) return reject(state, action, 'dayClosed');
  switch (action.type) {
    case 'PICK_CUP': {
      // Chơi một mình: một ly trên bảng. Nhiều người: mỗi trạm giữ tối đa một ly.
      if (state.solo && state.cups.length >= BOARD_SLOTS) return reject(state, action, 'boardFull');
      if (!state.solo && state.cups.some((c) => c.station === 'tea')) return reject(state, action, 'stationBusy');
      const used = consume(state.stock, stockIdOfCup(action.size));
      if (!used) return reject(state, action, 'outOfStock');
      const created = createCup(`cup${state.nextCupNumber}`, action.size, used.cost, state.customers[0]?.id ?? null);
      const cup = actor ? { ...created, makers: { tea: actor } } : created;
      return {
        state: { ...state, stock: used.stock, cups: [...state.cups, cup], nextCupNumber: state.nextCupNumber + 1 },
        events: [{ type: 'cupPicked', cupId: cup.id }],
      };
    }
    case 'POUR_TEA': {
      if (!state.unlockedTeas.includes(action.tea)) return reject(state, action, 'locked');
      const cup = state.cups.find((c) => c.id === action.cupId);
      // Mỗi ly trừ 1 đơn vị trà, lúc bắt đầu rót vào ly rỗng
      const stockId = cup && cup.tea === null ? stockIdOfTea(action.tea) : undefined;
      return brew(
        state,
        action,
        action.cupId,
        (c) => pourTea(c, action.tea, action.amount),
        (c) => (c.ruined ? [{ type: 'cupRuined', cupId: c.id }] : [{ type: 'poured', cupId: c.id }]),
        stockId,
      );
    }
    case 'TAP_SYRUP':
      return brew(state, action, action.cupId, tapSyrup, (c) => [{ type: 'syrupTapped', cupId: c.id }], STOCK_SUGAR);
    case 'SCOOP_ICE':
      return brew(state, action, action.cupId, scoopIce, (c) => [{ type: 'iceScooped', cupId: c.id }], STOCK_ICE);
    case 'ADD_TOPPING':
      if (!state.unlockedToppings.includes(action.topping)) return reject(state, action, 'locked');
      return brew(
        state,
        action,
        action.cupId,
        (c) => addTopping(c, action.topping),
        (c) => [{ type: 'toppingAdded', cupId: c.id, topping: action.topping }],
        stockIdOfTopping(action.topping),
      );
    case 'SEAL_CUP':
      return brew(state, action, action.cupId, sealCup, (c) => [{ type: 'cupSealed', cupId: c.id }]);
    case 'SERVE_CUP':
      return serveCup(state, action, actor);
    case 'DISCARD_CUP': {
      const cup = state.cups.find((c) => c.id === action.cupId);
      if (!cup) return reject(state, action, 'noCup');
      // Nguyên liệu của ly bỏ đi tính là hao phí
      return {
        state: {
          ...state,
          cups: state.cups.filter((c) => c.id !== action.cupId),
          today: { ...state.today, waste: state.today.waste + cup.cost, wasteCups: state.today.wasteCups + 1 },
        },
        events: [{ type: 'cupDiscarded', cupId: action.cupId }],
      };
    }
    case 'PASS_CUP': {
      const cup = state.cups.find((c) => c.id === action.cupId);
      if (!cup) return reject(state, action, 'noCup');
      if (cup.ruined) return reject(state, action, 'ruined');
      // Chỉ chuyền xuôi theo chuỗi trạm, và trạm nhận phải đang trống
      if (CUP_CHAIN.indexOf(action.to) <= CUP_CHAIN.indexOf(cup.station)) return reject(state, action, 'unknown');
      if (state.cups.some((c) => c.station === action.to)) return reject(state, action, 'stationBusy');
      return {
        state: replaceCup(state, { ...cup, station: action.to }),
        events: [{ type: 'cupPassed', cupId: cup.id, to: action.to }],
      };
    }
    case 'CUSTOMER_ARRIVE':
      return {
        state: {
          ...state,
          customers: [...state.customers, action.customer],
          nextCustomerIndex: state.nextCustomerIndex + 1,
          nextArrivalAt:
            state.time + arrivalGap(state.seed, state.day, state.nextCustomerIndex, state.customersToday),
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
    case 'RESTOCK':
      return inventoryResult(state, action, restock(state, action.item), {
        type: 'restocked',
        item: action.item,
        amount: getStockDef(action.item).packSize,
        price: restockPrice(state, action.item),
      });
    case 'UNLOCK_ITEM':
      return inventoryResult(state, action, unlockItem(state, action.kind, action.id), {
        type: 'unlocked',
        kind: action.kind,
        id: action.id,
      });
    case 'BUY_UPGRADE':
      return inventoryResult(state, action, buyUpgrade(state, action.id), { type: 'upgraded', id: action.id });
    case 'RENAME_SHOP': {
      const name = action.name.trim().slice(0, SHOP_NAME_MAX);
      if (!name) return reject(state, action, 'unknown');
      return { state: { ...state, shopName: name }, events: [{ type: 'renamed', name }] };
    }
    case 'END_DAY': {
      if (state.phase === 'closed') return reject(state, action, 'dayClosed');
      const { state: closed, summary } = closeDay(state);
      return { state: closed, events: [{ type: 'dayEnded', summary }] };
    }
    case 'START_DAY': {
      if (state.phase !== 'closed') return reject(state, action, 'unknown');
      const day = state.day + 1;
      return { state: startDay(state, day), events: [{ type: 'dayStarted', day }] };
    }
  }
}
