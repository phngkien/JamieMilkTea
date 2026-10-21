import { describe, expect, it } from 'vitest';
import { STARTING_TEAS } from '../src/config/teas';
import { STARTING_TOPPINGS } from '../src/config/toppings';
import { buildOrderText, generateCustomer } from '../src/core/orders';
import { createRng, hashSeed } from '../src/core/rng';
import { makeCustomer } from './helpers';

const unlocked = { teas: STARTING_TEAS, toppings: STARTING_TOPPINGS };

describe('rng', () => {
  it('cùng seed ra cùng dãy số', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('seed khác ra dãy khác; hashSeed ổn định', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
    expect(hashSeed(5, 1, 2)).toBe(hashSeed(5, 1, 2));
    expect(hashSeed(5, 1, 2)).not.toBe(hashSeed(5, 2, 1));
  });

  it('int nằm trong khoảng', () => {
    const rng = createRng(9);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
    }
  });
});

describe('orders', () => {
  it('cùng seed + số thứ tự thì cùng một khách', () => {
    expect(generateCustomer(7, 3, 1, unlocked, 0)).toEqual(generateCustomer(7, 3, 1, unlocked, 0));
  });

  it('order ngày 1 có 1 ly, chỉ dùng món đã mở, giá trị hợp lệ', () => {
    for (let i = 0; i < 100; i++) {
      const customer = generateCustomer(99, i, 1, unlocked, 0);
      expect(customer.order.cups).toHaveLength(1);
      const spec = customer.order.cups[0];
      expect(['M', 'L']).toContain(spec.size);
      expect(STARTING_TEAS).toContain(spec.tea);
      expect([0, 30, 50, 70, 100]).toContain(spec.sugar);
      expect(['none', 'less', 'normal']).toContain(spec.ice);
      expect(spec.toppings.length).toBeLessThanOrEqual(2);
      const ids = spec.toppings.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of spec.toppings) {
        expect(STARTING_TOPPINGS).toContain(t.id);
        expect(t.scoops).toBeGreaterThanOrEqual(1);
        expect(t.scoops).toBeLessThanOrEqual(2);
      }
    }
  });

  it('khách đầu tiên của ngày kiên nhẫn lâu hơn (cho hướng dẫn)', () => {
    const first = generateCustomer(1, 0, 1, unlocked, 0);
    const second = generateCustomer(1, 1, 1, unlocked, 0);
    expect(first.drainPerSecond).toBeLessThan(second.drainPerSecond);
    // Ngày 2 không còn khách hướng dẫn
    expect(generateCustomer(1, 0, 2, unlocked, 0).drainPerSecond).toBeGreaterThan(first.drainPerSecond);
  });

  it('câu gọi món tiếng Việt đầy đủ chi tiết', () => {
    const customer = makeCustomer({
      size: 'L',
      tea: 'matcha',
      sugar: 70,
      ice: 'none',
      toppings: [{ id: 'pearl-white', scoops: 1 }, { id: 'jelly', scoops: 2 }],
    });
    expect(buildOrderText(customer)).toBe(
      'Bạn ơi, cho mình 1 ly matcha size L, thêm trân châu trắng và 2 phần thạch dừa, 70% đường và không đá nha!',
    );
    const plain = makeCustomer({ size: 'M', tea: 'milk', sugar: 0, ice: 'less', toppings: [] }, { lineVariant: 1 });
    expect(buildOrderText(plain)).toBe('Cho em 1 ly trà sữa size M, không đường, ít đá ạ!');
  });
});
