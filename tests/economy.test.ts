import { describe, expect, it } from 'vitest';
import { cupPrice, formatMoney, formatRating } from '../src/core/economy';

describe('economy', () => {
  it('formatMoney theo kiểu nghìn đồng', () => {
    expect(formatMoney(25000)).toBe('25k');
    expect(formatMoney(2413500)).toBe('2.413,5k');
    expect(formatMoney(0)).toBe('0k');
    expect(formatMoney(1500)).toBe('1,5k');
    expect(formatMoney(1234567000)).toBe('1.234.567k');
    expect(formatMoney(-5000)).toBe('-5k');
  });

  it('giá ly = trà + phụ thu size + topping', () => {
    expect(cupPrice({ size: 'M', tea: 'milk', sugar: 50, ice: 'normal', toppings: [] })).toBe(25000);
    expect(
      cupPrice({
        size: 'L',
        tea: 'milk',
        sugar: 50,
        ice: 'normal',
        toppings: [{ id: 'pearl-black', scoops: 2 }, { id: 'pearl-white', scoops: 1 }],
      }),
    ).toBe(25000 + 8000 + 6000 + 8000);
  });

  it('formatRating kiểu "4,6"', () => {
    expect(formatRating(46, 10)).toBe('4,6');
    expect(formatRating(5, 1)).toBe('5,0');
    expect(formatRating(0, 0)).toBe('0');
  });
});
