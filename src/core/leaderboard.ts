// Bảng xếp hạng cuối ngày, "Nhân viên xuất sắc" và bảng thành tích của tiệm (CLAUDE.md mục 12). Hàm thuần, có test.
import { LEADERBOARD } from '../config/scoring';
import type { CupStation, FameEntry, StaffDay, StationTally } from './types';

const STATIONS: CupStation[] = ['tea', 'topping', 'cashier'];

const sum = (t: StationTally) => t.tea + t.topping + t.cashier;

/** Điểm trung bình (0–100) của một người: trung bình điểm ở mọi trạm người đó đã làm. */
export function averageScore(cups: StationTally, score: StationTally): number {
  const n = sum(cups);
  return n > 0 ? sum(score) / n : 0;
}

export interface LeaderRow {
  uid: string;
  name: string;
  /** Số ly đã tham gia. */
  drinks: number;
  /** Điểm trung bình, làm tròn. */
  average: number;
  bestStreak: number;
  tips: number;
  excellent: boolean;
}

/**
 * Xếp hạng những người đã làm ít nhất 1 ly. Người làm đủ `excellentMinCups` ly đứng trước (để ai làm
 * 1–2 ly may mắn không vượt mặt người làm nhiều); trong mỗi nhóm: điểm trung bình cao trước,
 * bằng điểm thì nhiều ly hơn trước.
 */
export function rankStaff(
  staff: Record<string, StaffDay>,
  names: Record<string, string>,
  excellent: string | null,
  fallbackName = '?',
): LeaderRow[] {
  return Object.entries(staff)
    .filter(([, d]) => d.drinks > 0)
    .map(([uid, d]) => ({
      uid,
      name: names[uid] || fallbackName,
      drinks: d.drinks,
      exact: averageScore(d.cups, d.score),
      average: Math.round(averageScore(d.cups, d.score)),
      bestStreak: d.bestStreak,
      tips: d.tips,
      excellent: uid === excellent,
    }))
    .sort((a, b) => {
      const enough = (r: { drinks: number }) => (r.drinks >= LEADERBOARD.excellentMinCups ? 1 : 0);
      return enough(b) - enough(a) || b.exact - a.exact || b.drinks - a.drinks || a.uid.localeCompare(b.uid);
    })
    .map(({ exact: _exact, ...row }) => {
      void _exact;
      return row;
    });
}

/**
 * Chọn "Nhân viên xuất sắc" của ngày: điểm trung bình cao nhất trong số người làm từ
 * `excellentMinCups` ly trở lên. Cần ít nhất `excellentMinPlayers` người làm trong ngày.
 * Bằng điểm thì ai làm nhiều ly hơn thắng. Không ai đủ điều kiện → null.
 */
export function pickExcellent(staff: Record<string, StaffDay>): string | null {
  const workers = Object.entries(staff).filter(([, d]) => d.drinks > 0);
  if (workers.length < LEADERBOARD.excellentMinPlayers) return null;
  const best = workers
    .filter(([, d]) => d.drinks >= LEADERBOARD.excellentMinCups)
    .sort(
      ([ua, a], [ub, b]) =>
        averageScore(b.cups, b.score) - averageScore(a.cups, a.score) || b.drinks - a.drinks || ua.localeCompare(ub),
    )[0];
  return best ? best[0] : null;
}

export function emptyFame(name = ''): FameEntry {
  return {
    name,
    days: 0,
    excellent: 0,
    bestStreak: 0,
    cups: { tea: 0, topping: 0, cashier: 0 },
    score: { tea: 0, topping: 0, cashier: 0 },
  };
}

/**
 * Cộng một ngày làm việc vào bảng thành tích của tiệm. Giữ tối đa `fameLimit` người
 * (bỏ người ít ngày công nhất khi quá).
 */
export function addDayToFame(
  fame: Record<string, FameEntry>,
  staff: Record<string, StaffDay>,
  names: Record<string, string>,
  excellent: string | null,
): Record<string, FameEntry> {
  const next: Record<string, FameEntry> = { ...fame };
  for (const [uid, d] of Object.entries(staff)) {
    if (d.drinks <= 0) continue;
    const old = next[uid] ?? emptyFame();
    const cups = { ...old.cups };
    const score = { ...old.score };
    for (const s of STATIONS) {
      cups[s] += d.cups[s];
      score[s] += d.score[s];
    }
    next[uid] = {
      name: names[uid] || old.name,
      days: old.days + 1,
      excellent: old.excellent + (uid === excellent ? 1 : 0),
      bestStreak: Math.max(old.bestStreak, d.bestStreak),
      cups,
      score,
    };
  }
  const uids = Object.keys(next);
  if (uids.length <= LEADERBOARD.fameLimit) return next;
  const keep = uids
    .sort((a, b) => next[b].days - next[a].days || next[b].excellent - next[a].excellent || a.localeCompare(b))
    .slice(0, LEADERBOARD.fameLimit);
  const trimmed: Record<string, FameEntry> = {};
  for (const uid of keep) trimmed[uid] = next[uid];
  return trimmed;
}

export interface FameHolder {
  uid: string;
  name: string;
  value: number;
}

export interface FameBoard {
  /** Ai đạt "Nhân viên xuất sắc" nhiều lần nhất. */
  mostExcellent: FameHolder | null;
  /** Chuỗi hoàn hảo dài nhất. */
  longestStreak: FameHolder | null;
  /** Giỏi nhất từng trạm (điểm trung bình, phải làm tối thiểu `stationMinCups` ly ở trạm đó). */
  bestAt: Record<CupStation, FameHolder | null>;
}

function top(fame: Record<string, FameEntry>, value: (e: FameEntry) => number, eligible: (e: FameEntry) => boolean): FameHolder | null {
  let best: FameHolder | null = null;
  for (const uid of Object.keys(fame).sort()) {
    const e = fame[uid];
    if (!eligible(e)) continue;
    const v = value(e);
    if (!best || v > best.value) best = { uid, name: e.name, value: v };
  }
  return best;
}

/** Tóm tắt bảng thành tích của tiệm để hiển thị. */
export function fameBoard(fame: Record<string, FameEntry>): FameBoard {
  const bestAt = {} as Record<CupStation, FameHolder | null>;
  for (const s of STATIONS) {
    const holder = top(
      fame,
      (e) => e.score[s] / e.cups[s],
      (e) => e.cups[s] >= LEADERBOARD.stationMinCups,
    );
    bestAt[s] = holder ? { ...holder, value: Math.round(holder.value) } : null;
  }
  return {
    mostExcellent: top(fame, (e) => e.excellent, (e) => e.excellent > 0),
    longestStreak: top(fame, (e) => e.bestStreak, (e) => e.bestStreak > 0),
    bestAt,
  };
}
