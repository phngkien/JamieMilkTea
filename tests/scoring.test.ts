import { describe, expect, it } from 'vitest';
import { SIZES } from '../src/config/cup';
import { pourAccuracy, scoreCup, starsFromScore, toppingAccuracy } from '../src/core/scoring';
import type { CupSpec, CupState } from '../src/core/types';
import { SPEC } from './helpers';

const center = (size: 'M' | 'L') => (SIZES[size].greenMin + SIZES[size].greenMax) / 2;

/** Ly pha đúng hoàn toàn theo SPEC (matcha M, 50% đường, đá bình thường, 1 muỗng trân châu trắng). */
function perfectCup(spec: CupSpec = SPEC): CupState {
  return {
    id: 'cup1',
    size: spec.size,
    tea: spec.tea,
    fill: center(spec.size),
    sugarTaps: 2,
    iceScoops: 2,
    toppings: spec.toppings.map((t) => ({ ...t })),
    sealed: true,
    ruined: false,
    cost: 0,
    station: 'tea',
    forCustomer: null,
  };
}

describe('scoring', () => {
  it('ly hoàn hảo, khách còn đầy kiên nhẫn = 100 điểm, 5 sao', () => {
    const score = scoreCup(SPEC, perfectCup(), 1);
    expect(score.total).toBe(100);
    expect(score.stars).toBe(5);
    expect(score.capped).toBe(false);
  });

  it('ly hoàn hảo, kiên nhẫn còn 90% vẫn khoảng 98', () => {
    expect(scoreCup(SPEC, perfectCup(), 0.9).total).toBe(98);
  });

  it('sai size thì tối đa 40', () => {
    const cup = { ...perfectCup(), size: 'L' as const };
    const score = scoreCup(SPEC, cup, 1);
    expect(score.total).toBeLessThanOrEqual(40);
    expect(score.capped).toBe(true);
  });

  it('sai loại trà thì tối đa 40', () => {
    const cup = { ...perfectCup(), tea: 'milk' };
    expect(scoreCup(SPEC, cup, 1).total).toBeLessThanOrEqual(40);
  });

  it('rót giữa vùng xanh chính xác nhất, ra xa thì giảm', () => {
    const { greenMin, greenMax } = SIZES.M;
    expect(pourAccuracy(center('M'), 'M')).toBe(1);
    expect(pourAccuracy(greenMax, 'M')).toBeCloseTo(0.7);
    expect(pourAccuracy(greenMin, 'M')).toBeCloseTo(0.7);
    expect(pourAccuracy(0.3, 'M')).toBe(0);
    expect(pourAccuracy(0.85, 'M')).toBeLessThan(0.7);
  });

  it('lệch một mức đường bị trừ một phần', () => {
    const cup = { ...perfectCup(), sugarTaps: 3 }; // 70% thay vì 50%
    const score = scoreCup(SPEC, cup, 1);
    expect(score.parts.sugar).toBeCloseTo(6);
    expect(score.total).toBe(91);
  });

  it('topping: thiếu, thừa, sai số muỗng', () => {
    const want = [{ id: 'jelly', scoops: 2 }];
    expect(toppingAccuracy(want, [{ id: 'jelly', scoops: 2 }])).toBe(1);
    expect(toppingAccuracy(want, [{ id: 'jelly', scoops: 1 }])).toBe(0.5);
    expect(toppingAccuracy(want, [])).toBe(0);
    expect(toppingAccuracy(want, [{ id: 'jelly', scoops: 2 }, { id: 'pearl-black', scoops: 1 }])).toBe(0.5);
    expect(toppingAccuracy([], [])).toBe(1);
  });

  it('sao = điểm / 20 làm tròn', () => {
    expect(starsFromScore(100)).toBe(5);
    expect(starsFromScore(89)).toBe(4);
    expect(starsFromScore(40)).toBe(2);
    expect(starsFromScore(0)).toBe(0);
  });
});
