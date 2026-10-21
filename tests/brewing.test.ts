import { describe, expect, it } from 'vitest';
import {
  addTopping,
  createCup,
  describeCupStatus,
  pourTea,
  scoopIce,
  sealCup,
  tapSyrup,
  type BrewResult,
} from '../src/core/brewing';
import type { CupState } from '../src/core/types';

function ok(result: BrewResult): CupState {
  if (!result.ok) throw new Error(`Bị từ chối: ${result.reason}`);
  return result.cup;
}

describe('brewing', () => {
  it('rót trà cộng dồn mực nước', () => {
    let cup = createCup('a', 'M');
    cup = ok(pourTea(cup, 'milk', 0.4));
    cup = ok(pourTea(cup, 'milk', 0.35));
    expect(cup.tea).toBe('milk');
    expect(cup.fill).toBeCloseTo(0.75);
    expect(cup.ruined).toBe(false);
  });

  it('rót tràn làm hỏng ly, sau đó không thao tác được nữa', () => {
    const cup = ok(pourTea(createCup('a', 'M'), 'milk', 1.05));
    expect(cup.ruined).toBe(true);
    expect(tapSyrup(cup)).toEqual({ ok: false, reason: 'ruined' });
    expect(sealCup(cup)).toEqual({ ok: false, reason: 'ruined' });
  });

  it('không cho rót loại trà khác vào ly đã có trà', () => {
    const cup = ok(pourTea(createCup('a', 'M'), 'milk', 0.3));
    expect(pourTea(cup, 'matcha', 0.1)).toEqual({ ok: false, reason: 'differentTea' });
  });

  it('chạm đường tối đa 4 lần, lần thứ 5 bị chặn', () => {
    let cup = createCup('a', 'M');
    for (let i = 0; i < 4; i++) cup = ok(tapSyrup(cup));
    expect(cup.sugarTaps).toBe(4);
    expect(tapSyrup(cup)).toEqual({ ok: false, reason: 'sugarMax' });
  });

  it('đá tối đa 2 muỗng', () => {
    let cup = createCup('a', 'M');
    cup = ok(scoopIce(ok(scoopIce(cup))));
    expect(scoopIce(cup)).toEqual({ ok: false, reason: 'iceMax' });
  });

  it('topping tối đa 2 muỗng mỗi loại và 2 loại mỗi ly', () => {
    let cup = createCup('a', 'M');
    cup = ok(addTopping(cup, 'jelly'));
    cup = ok(addTopping(cup, 'jelly'));
    expect(addTopping(cup, 'jelly')).toEqual({ ok: false, reason: 'toppingMax' });
    cup = ok(addTopping(cup, 'pearl-black'));
    expect(addTopping(cup, 'pearl-white')).toEqual({ ok: false, reason: 'toppingTypesMax' });
    expect(cup.toppings).toEqual([
      { id: 'jelly', scoops: 2 },
      { id: 'pearl-black', scoops: 1 },
    ]);
  });

  it('ép nắp: ly rỗng thì chưa ép được, ép rồi không thêm được', () => {
    expect(sealCup(createCup('a', 'M'))).toEqual({ ok: false, reason: 'emptyCup' });
    const cup = ok(sealCup(ok(pourTea(createCup('a', 'M'), 'milk', 0.7))));
    expect(cup.sealed).toBe(true);
    expect(scoopIce(cup)).toEqual({ ok: false, reason: 'sealed' });
  });

  it('dòng trạng thái dưới ly', () => {
    let cup = createCup('a', 'M');
    expect(describeCupStatus(cup)).toBe('Đường — · không đá');
    cup = ok(tapSyrup(ok(tapSyrup(cup))));
    cup = ok(scoopIce(ok(scoopIce(cup))));
    expect(describeCupStatus(cup)).toBe('Đường 50% · đá bình thường');
  });
});
