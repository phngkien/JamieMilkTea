import { describe, expect, it } from 'vitest';
import { LEADERBOARD } from '../src/config/scoring';
import { closeDay } from '../src/core/day';
import { creditCup, emptyStaffDay } from '../src/core/economy';
import { addDayToFame, averageScore, emptyFame, fameBoard, pickExcellent, rankStaff } from '../src/core/leaderboard';
import { createProfile, creditProfile, ledgerKey } from '../src/core/profile';
import { createShopState, reduce } from '../src/core/reducer';
import type { StaffDay, StationScores } from '../src/core/types';
import { decodeFame, decodeStaff } from '../src/net/serialize';
import { normalizeProfile, normalizeShop, shopSaveOf } from '../src/save/schema';

const scores = (tea: number, topping: number, cashier: number): StationScores => ({ tea, topping, cashier });

/** Một người làm `drinks` ly ở Quầy trà, mỗi ly `score` điểm. */
function worker(drinks: number, score: number): StaffDay {
  let staff: Record<string, StaffDay> = {};
  for (let i = 0; i < drinks; i++) staff = creditCup(staff, { tea: 'x' }, scores(score, 0, 0), {});
  return staff.x;
}

describe('chuỗi ly hoàn hảo', () => {
  it('ly đạt mức hoàn hảo thì chuỗi tăng, ly kém thì chuỗi về 0 nhưng giữ chuỗi dài nhất', () => {
    let staff: Record<string, StaffDay> = {};
    const good = scores(95, 0, 0);
    const bad = scores(40, 0, 0);
    for (const s of [good, good, good, bad, good]) staff = creditCup(staff, { tea: 'a' }, s, {});
    expect(staff.a.streak).toBe(1);
    expect(staff.a.bestStreak).toBe(3);
    expect(staff.a.drinks).toBe(5);
  });

  it('một người làm cả 3 trạm của một ly: tính 1 ly, điểm cá nhân là trung bình các trạm', () => {
    let staff = creditCup({}, { tea: 'a', topping: 'a', cashier: 'a' }, scores(100, 100, 70), {});
    expect(staff.a.drinks).toBe(1);
    expect(staff.a.cups).toEqual({ tea: 1, topping: 1, cashier: 1 });
    expect(staff.a.streak).toBe(1); // (100+100+70)/3 = 90
    staff = creditCup(staff, { tea: 'a', topping: 'a', cashier: 'a' }, scores(100, 80, 80), {});
    expect(staff.a.streak).toBe(0);
  });

  it('mỗi người có chuỗi riêng theo điểm trạm của mình', () => {
    const staff = creditCup({}, { tea: 'a', topping: 'b' }, scores(100, 30, 0), {});
    expect(staff.a.streak).toBe(1);
    expect(staff.b.streak).toBe(0);
  });
});

describe('xếp hạng cuối ngày', () => {
  it('điểm trung bình cao đứng trước, bằng điểm thì nhiều ly hơn đứng trước', () => {
    const staff = { a: worker(3, 70), b: worker(4, 90), c: worker(6, 90), d: emptyStaffDay() };
    const rows = rankStaff(staff, { a: 'An', b: 'Bình' }, 'c', 'Bạn');
    expect(rows.map((r) => r.uid)).toEqual(['c', 'b', 'a']); // d chưa làm ly nào thì không hiện
    expect(rows[0]).toMatchObject({ name: 'Bạn', average: 90, drinks: 6, excellent: true });
    expect(rows[2].name).toBe('An');
  });

  it('người làm chưa đủ số ly tối thiểu đứng sau, dù điểm cao hơn', () => {
    const few = LEADERBOARD.excellentMinCups - 1;
    const rows = rankStaff({ a: worker(few, 100), b: worker(LEADERBOARD.excellentMinCups, 70) }, {}, null);
    expect(rows.map((r) => r.uid)).toEqual(['b', 'a']);
  });

  it('averageScore =tổng điểm / tổng số lượt trạm', () => {
    expect(averageScore({ tea: 2, topping: 1, cashier: 0 }, { tea: 180, topping: 60, cashier: 0 })).toBe(80);
    expect(averageScore({ tea: 0, topping: 0, cashier: 0 }, { tea: 0, topping: 0, cashier: 0 })).toBe(0);
  });
});

describe('Nhân viên xuất sắc', () => {
  it('chọn người điểm cao nhất trong số người làm đủ số ly tối thiểu', () => {
    const few = LEADERBOARD.excellentMinCups - 1;
    expect(pickExcellent({ a: worker(few, 100), b: worker(LEADERBOARD.excellentMinCups, 80) })).toBe('b');
  });

  it('không ai đủ số ly thì không có', () => {
    expect(pickExcellent({ a: worker(1, 100), b: worker(1, 90) })).toBeNull();
  });

  it('chơi một mình thì không trao danh hiệu', () => {
    expect(pickExcellent({ a: worker(10, 100) })).toBeNull();
  });

  it('bằng điểm thì ai làm nhiều ly hơn thắng', () => {
    expect(pickExcellent({ a: worker(3, 90), b: worker(5, 90) })).toBe('b');
  });
});

describe('đóng cửa ngày', () => {
  it('ghi Nhân viên xuất sắc, tên, và bảng thành tích của tiệm', () => {
    const base = createShopState(7);
    const state = { ...base, solo: false, today: { ...base.today, staff: { a: worker(3, 95), b: worker(4, 60) } } };
    const { state: closed, summary } = closeDay(state, { a: 'An', b: 'Bình', z: 'Người ngoài' });
    expect(summary.excellent).toBe('a');
    expect(summary.names).toEqual({ a: 'An', b: 'Bình' });
    expect(summary.staff.a.excellent).toBe(1);
    expect(summary.staff.b.excellent).toBe(0);
    expect(closed.fame.a).toMatchObject({ name: 'An', days: 1, excellent: 1, bestStreak: 3 });
    expect(closed.fame.b).toMatchObject({ name: 'Bình', days: 1, excellent: 0 });
    expect(closed.history.at(-1)?.excellent).toBe('a');
  });

  it('END_DAY nhận tên người chơi từ chủ phòng', () => {
    const base = createShopState(7);
    const state = { ...base, today: { ...base.today, staff: { me: worker(2, 90) } } };
    const r = reduce(state, { type: 'END_DAY', names: { me: 'Jamie' } });
    expect(r.state.fame.me.name).toBe('Jamie');
  });
});

describe('bảng thành tích của tiệm', () => {
  it('cộng dồn qua nhiều ngày, giữ chuỗi dài nhất', () => {
    let fame = addDayToFame({}, { a: worker(3, 95) }, { a: 'An' }, 'a');
    fame = addDayToFame(fame, { a: worker(5, 50) }, {}, null);
    expect(fame.a).toMatchObject({ name: 'An', days: 2, excellent: 1, bestStreak: 3 });
    expect(fame.a.cups.tea).toBe(8);
    expect(fame.a.score.tea).toBe(3 * 95 + 5 * 50);
  });

  it('giữ tối đa fameLimit người, bỏ người ít ngày công nhất', () => {
    const fame: Record<string, ReturnType<typeof emptyFame>> = {};
    for (let i = 0; i < LEADERBOARD.fameLimit; i++) fame[`u${i}`] = { ...emptyFame(`P${i}`), days: 5 };
    const next = addDayToFame(fame, { newbie: worker(1, 90) }, { newbie: 'Mới' }, null);
    expect(Object.keys(next)).toHaveLength(LEADERBOARD.fameLimit);
    expect(next.newbie).toBeUndefined();
  });

  it('giỏi nhất từng trạm chỉ tính người làm đủ số ly ở trạm đó', () => {
    const n = LEADERBOARD.stationMinCups;
    const fame = {
      a: { ...emptyFame('An'), excellent: 2, bestStreak: 4, cups: { tea: n, topping: 0, cashier: 0 }, score: { tea: n * 80, topping: 0, cashier: 0 } },
      b: { ...emptyFame('Bình'), excellent: 3, bestStreak: 9, cups: { tea: n - 1, topping: 0, cashier: 0 }, score: { tea: (n - 1) * 100, topping: 0, cashier: 0 } },
    };
    const board = fameBoard(fame);
    expect(board.bestAt.tea).toEqual({ uid: 'a', name: 'An', value: 80 });
    expect(board.bestAt.topping).toBeNull();
    expect(board.mostExcellent?.uid).toBe('b');
    expect(board.longestStreak).toEqual({ uid: 'b', name: 'Bình', value: 9 });
  });
});

describe('profile: Nhân viên xuất sắc và chuỗi dài nhất', () => {
  it('cộng đúng một lần dù gọi nhiều lần', () => {
    const day: StaffDay = { ...worker(3, 95), excellent: 1 };
    const key = ledgerKey('run', 1);
    const first = creditProfile(createProfile('u'), {}, key, day, 1);
    expect(first.profile.excellent).toBe(1);
    expect(first.profile.bestStreak).toBe(3);
    const again = creditProfile(first.profile, first.ledger, key, day, 2);
    expect(again.profile).toBe(first.profile);
  });

  it('chuỗi dài nhất của profile không bị giảm bởi ngày kém hơn', () => {
    const p = { ...createProfile('u'), bestStreak: 10 };
    const r = creditProfile(p, {}, ledgerKey('run', 2), worker(2, 95), 1);
    expect(r.profile.bestStreak).toBe(10);
  });
});

describe('lưu và đọc lại', () => {
  it('bản lưu cũ (thiếu fame, bestStreak, chuỗi) được điền mặc định', () => {
    const old = shopSaveOf(createShopState(1), { ownerUid: '', cloudBase: 0 }, 1) as unknown as Record<string, unknown>;
    delete old.fame;
    expect(normalizeShop(old)?.fame).toEqual({});
    expect(normalizeProfile({ tipCoins: 5 }).bestStreak).toBe(0);
    const staff = decodeStaff({ a: { tips: 1, cups: { tea: 1 }, score: { tea: 90 } } });
    expect(staff.a).toMatchObject({ drinks: 0, streak: 0, bestStreak: 0, excellent: 0 });
  });

  it('bảng thành tích đọc lại đúng, dữ liệu hỏng thì về 0', () => {
    const fame = addDayToFame({}, { a: worker(3, 95) }, { a: 'An' }, 'a');
    expect(decodeFame(JSON.parse(JSON.stringify(fame)))).toEqual(fame);
    expect(decodeFame({ x: { days: -3, name: 42 } }).x).toEqual(emptyFame(''));
  });
});
