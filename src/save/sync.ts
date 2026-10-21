// Quy tắc đồng bộ giữa bản lưu trên máy và trên cloud (CLAUDE.md mục 10). Hàm thuần, có test.
//
// - Profile: bản nào `updatedAt` mới hơn thì thắng.
// - Tiệm: cloud thắng nếu cloud ĐÃ BỊ SỬA kể từ lần đồng bộ trước (ví dụ đã chơi trên iPad, hoặc
//   bạn bè chơi ở tiệm mình). Nếu cloud vẫn y như lần đồng bộ trước thì phần chơi offline trên máy
//   được đẩy lên (không mất các ngày vừa chơi khi mất mạng).
import type { Profile } from '../core/types';
import { normalizeProfile, normalizeShop, type ShopSave } from './schema';

export interface Resolution<T> {
  /** Bản dùng tiếp. */
  use: 'local' | 'cloud';
  data: T | null;
  /** Cần đẩy bản trên máy lên cloud. */
  push: boolean;
}

export function resolveShop(local: ShopSave | null, cloud: ShopSave | null): Resolution<ShopSave> {
  if (!cloud) return { use: 'local', data: local, push: local !== null };
  if (!local) return { use: 'cloud', data: cloud, push: false };
  if (local.cloudBase !== 0 && cloud.updatedAt === local.cloudBase) {
    // Cloud chưa ai sửa từ lần đồng bộ trước → máy giữ bản mới nhất
    return { use: 'local', data: local, push: local.updatedAt > cloud.updatedAt };
  }
  return { use: 'cloud', data: cloud, push: false };
}

export function resolveProfile(local: Profile | null, cloud: Profile | null): Resolution<Profile> {
  if (!cloud) return { use: 'local', data: local, push: local !== null };
  if (!local) return { use: 'cloud', data: cloud, push: false };
  if (local.updatedAt > cloud.updatedAt) return { use: 'local', data: local, push: true };
  return { use: 'cloud', data: cloud, push: false };
}

/** Khóa của một ngày trong lịch sử trên cloud (không dùng số trần vì Firebase sẽ đổi thành mảng). */
export const historyKey = (day: number) => `d${day}`;

/** Tiệm → dạng lưu trên cloud (/shops/{uid}). Lịch sử là object theo ngày để ghi từng ngày riêng. */
export function shopToCloud(shop: ShopSave, room: string | null = null): Record<string, unknown> {
  const { cloudBase: _base, history, ...rest } = shop;
  void _base;
  return JSON.parse(
    JSON.stringify({
      ...rest,
      history: Object.fromEntries(history.map((h) => [historyKey(h.day), h])),
      room,
    }),
  ) as Record<string, unknown>;
}

/** Đọc tiệm từ cloud. `cloudBase` = chính `updatedAt` của bản cloud (vừa đồng bộ xong). */
export function shopFromCloud(raw: unknown): ShopSave | null {
  const shop = normalizeShop(raw);
  return shop ? { ...shop, cloudBase: shop.updatedAt } : null;
}

export function profileToCloud(profile: Profile): Record<string, unknown> {
  return JSON.parse(JSON.stringify(profile)) as Record<string, unknown>;
}

export function profileFromCloud(raw: unknown): Profile | null {
  return raw ? normalizeProfile(raw) : null;
}
