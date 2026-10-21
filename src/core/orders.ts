// Sinh khách và order từ seed của ngày, để mọi máy ra cùng một kết quả.
import { SUGAR_STEPS, ICE_STEPS } from '../config/cup';
import { CUSTOMER_LOOKS, CUSTOMER_NAMES } from '../config/customers';
import { MAX_CUSTOMERS, getDayConfig } from '../config/progression';
import {
  ICE_TEXT,
  ORDER_CUP_LINE,
  ORDER_MULTI_INTRO,
  ORDER_TEMPLATES,
  SUGAR_TEXT,
  TOPPING_TEXT,
  fill,
} from '../config/strings';
import { getTea } from '../config/teas';
import { getTopping } from '../config/toppings';
import { createRng, hashSeed, type Rng } from './rng';
import type { Action, CupSpec, Customer, ShopState, Size, ToppingPortion } from './types';

/** Mã riêng để seed sinh khách khác seed tính khoảng cách giữa các khách. */
const SALT_CUSTOMER = 1;
const SALT_ARRIVAL = 2;

function generateCupSpec(rng: Rng, day: number, teas: string[], toppings: string[]): CupSpec {
  const cfg = getDayConfig(day);
  const size: Size = rng.chance(0.5) ? 'M' : 'L';
  const toppingCount = Math.min(rng.weighted(cfg.toppingCountWeights), toppings.length);
  // Chọn các loại topping khác nhau
  const pool = [...toppings];
  const chosen: ToppingPortion[] = [];
  for (let i = 0; i < toppingCount; i++) {
    const index = rng.int(0, pool.length - 1);
    const [id] = pool.splice(index, 1);
    chosen.push({ id, scoops: rng.chance(cfg.doubleScoopChance) ? 2 : 1 });
  }
  return {
    size,
    tea: rng.pick(teas),
    sugar: rng.pick(SUGAR_STEPS),
    ice: rng.pick(ICE_STEPS),
    toppings: chosen,
  };
}

/** Sinh khách thứ `index` của ngày. Cùng (seed, index) luôn ra cùng một khách. */
export function generateCustomer(
  seed: number,
  index: number,
  day: number,
  unlocked: { teas: string[]; toppings: string[] },
  now: number,
): Customer {
  const cfg = getDayConfig(day);
  const rng = createRng(hashSeed(seed, SALT_CUSTOMER, index));
  const cupCount = rng.chance(cfg.twoCupChance) ? 2 : 1;
  const cups: CupSpec[] = [];
  for (let i = 0; i < cupCount; i++) cups.push(generateCupSpec(rng, day, unlocked.teas, unlocked.toppings));
  const patienceSeconds = index === 0 ? cfg.firstCustomerPatienceSeconds : cfg.patienceSeconds;
  return {
    id: `c${index}`,
    name: rng.pick(CUSTOMER_NAMES),
    look: rng.int(0, CUSTOMER_LOOKS.length - 1),
    lineVariant: rng.int(0, ORDER_TEMPLATES.length - 1),
    order: { id: `o${index}`, cups, served: cups.map(() => null) },
    patience: 1,
    drainPerSecond: 1 / patienceSeconds,
    arrivedAt: now,
  };
}

/** Khoảng chờ từ khách `index` tới khách kế tiếp (ms). */
export function arrivalGap(seed: number, index: number, day: number): number {
  const [min, max] = getDayConfig(day).arrivalGapMs;
  return createRng(hashSeed(seed, SALT_ARRIVAL, index)).int(min, max);
}

/**
 * Việc chủ phòng (host) cần làm ở thời điểm hiện tại: hiện chỉ là cho khách mới vào.
 * Chơi đơn và nhiều người đều gọi hàm này nên khách đến giống nhau.
 */
export function planHostActions(state: ShopState): Action[] {
  if (state.time < state.nextArrivalAt || state.customers.length >= MAX_CUSTOMERS) return [];
  const customer = generateCustomer(
    state.seed,
    state.nextCustomerIndex,
    state.day,
    { teas: state.unlockedTeas, toppings: state.unlockedToppings },
    state.time,
  );
  return [{ type: 'CUSTOMER_ARRIVE', customer }];
}

function toppingPhrase(toppings: ToppingPortion[]): string {
  if (toppings.length === 0) return '';
  const names = toppings.map((t) => {
    const name = getTopping(t.id).name.toLowerCase();
    return t.scoops > 1 ? fill(TOPPING_TEXT.double, { name }) : name;
  });
  return TOPPING_TEXT.prefix + names.join(TOPPING_TEXT.joiner);
}

function cupVars(spec: CupSpec): Record<string, string> {
  return {
    tea: getTea(spec.tea).name.toLowerCase(),
    size: spec.size,
    toppings: toppingPhrase(spec.toppings),
    sugar: spec.sugar === 0 ? SUGAR_TEXT.zero : fill(SUGAR_TEXT.percent, { p: spec.sugar }),
    ice: ICE_TEXT[spec.ice],
  };
}

/** Câu gọi món của khách (tiếng Việt), ghép từ mẫu câu có biến. */
export function buildOrderText(customer: Customer): string {
  const cups = customer.order.cups;
  if (cups.length === 1) {
    const template = ORDER_TEMPLATES[customer.lineVariant % ORDER_TEMPLATES.length];
    return fill(template, { n: 1, ...cupVars(cups[0]) });
  }
  const lines = cups.map((spec, i) => fill(ORDER_CUP_LINE, { k: i + 1, ...cupVars(spec) }));
  return [fill(ORDER_MULTI_INTRO, { n: cups.length }), ...lines].join('\n');
}

/** Mô tả ngắn một ly (dùng cho tab Ly 1 / Ly 2). */
export function buildCupText(spec: CupSpec, k: number): string {
  return fill(ORDER_CUP_LINE, { k, ...cupVars(spec) });
}
