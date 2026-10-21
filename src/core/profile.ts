// Hồ sơ cá nhân: cộng tip và thống kê từ công sức trong ngày, mua / mặc outfit. Hàm thuần, có test.
import { DEFAULT_OUTFIT, OUTFITS } from '../config/outfits';
import { emptyStaffDay } from './economy';
import type { CupStation, Profile, StaffDay } from './types';

const STATIONS: CupStation[] = ['tea', 'topping', 'cashier'];
/** Sổ ghi đã cộng giữ tối đa bao nhiêu lượt chơi gần nhất. */
export const LEDGER_LIMIT = 30;

/**
 * Sổ ghi "đã cộng vào profile bao nhiêu" cho từng lượt chơi (khóa `runId:ngày`).
 * Nhờ sổ này, cùng một công sức không bao giờ bị cộng hai lần (lưu lại, vào lại phòng, mất mạng...).
 */
export type Ledger = Record<string, StaffDay>;

export function createProfile(uid = '', name = '', now = 0): Profile {
  return {
    uid,
    name,
    outfit: DEFAULT_OUTFIT,
    ownedOutfits: [DEFAULT_OUTFIT],
    tipCoins: 0,
    stats: { tea: { cups: 0, scoreSum: 0 }, topping: { cups: 0, scoreSum: 0 }, cashier: { cups: 0, scoreSum: 0 } },
    excellent: 0,
    updatedAt: now,
  };
}

export function ledgerKey(runId: string, day: number): string {
  return `${runId}:${day}`;
}

/**
 * Cộng phần công sức MỚI của `staff` (so với lần cộng trước cùng khóa) vào profile.
 * Trả về profile và sổ ghi mới, cùng số tip vừa nhận. Không có gì mới thì trả lại đúng object cũ.
 */
export function creditProfile(
  profile: Profile,
  ledger: Ledger,
  key: string,
  staff: StaffDay,
  now: number,
): { profile: Profile; ledger: Ledger; gained: number } {
  const before = ledger[key] ?? emptyStaffDay();
  // Gọi rất thường xuyên (mỗi lần state đổi): không có gì mới thì thoát sớm, không tạo object mới
  const nothingNew =
    staff.tips <= before.tips && STATIONS.every((s) => staff.cups[s] <= before.cups[s] && staff.score[s] <= before.score[s]);
  if (nothingNew) return { profile, ledger, gained: 0 };
  const gained = Math.max(0, staff.tips - before.tips);
  const stats = { ...profile.stats };
  let changed = gained > 0;
  for (const s of STATIONS) {
    const cups = Math.max(0, staff.cups[s] - before.cups[s]);
    const score = Math.max(0, staff.score[s] - before.score[s]);
    if (cups === 0 && score === 0) continue;
    changed = true;
    stats[s] = { cups: stats[s].cups + cups, scoreSum: stats[s].scoreSum + score };
  }
  if (!changed) return { profile, ledger, gained: 0 };
  // Sổ ghi giữ giá trị lớn nhất đã thấy (state có thể tạm lùi khi chờ chủ phòng xác nhận)
  const merged: StaffDay = {
    tips: Math.max(staff.tips, before.tips),
    cups: { ...before.cups },
    score: { ...before.score },
  };
  for (const s of STATIONS) {
    merged.cups[s] = Math.max(staff.cups[s], before.cups[s]);
    merged.score[s] = Math.max(staff.score[s], before.score[s]);
  }
  const { [key]: _old, ...rest } = ledger;
  void _old;
  const keys = Object.keys(rest);
  const kept = keys.slice(Math.max(0, keys.length - (LEDGER_LIMIT - 1)));
  const nextLedger: Ledger = {};
  for (const k of kept) nextLedger[k] = rest[k];
  nextLedger[key] = merged;
  return {
    profile: { ...profile, tipCoins: profile.tipCoins + gained, stats, updatedAt: now },
    ledger: nextLedger,
    gained,
  };
}

export type OutfitResult = { ok: true; profile: Profile } | { ok: false; reason: 'noTips' | 'alreadyOwned' | 'notOwned' | 'unknown' };

/** Mua outfit bằng tiền tip cá nhân, mua xong mặc luôn. */
export function buyOutfit(profile: Profile, id: string, now: number): OutfitResult {
  const def = OUTFITS.find((o) => o.id === id);
  if (!def) return { ok: false, reason: 'unknown' };
  if (profile.ownedOutfits.includes(id)) return { ok: false, reason: 'alreadyOwned' };
  if (profile.tipCoins < def.price) return { ok: false, reason: 'noTips' };
  return {
    ok: true,
    profile: {
      ...profile,
      tipCoins: profile.tipCoins - def.price,
      ownedOutfits: [...profile.ownedOutfits, id],
      outfit: id,
      updatedAt: now,
    },
  };
}

export function wearOutfit(profile: Profile, id: string, now: number): OutfitResult {
  if (!profile.ownedOutfits.includes(id)) return { ok: false, reason: 'notOwned' };
  return { ok: true, profile: { ...profile, outfit: id, updatedAt: now } };
}
