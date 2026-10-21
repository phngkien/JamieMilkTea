// Outfit của nhân viên (người chơi), mua bằng tiền tip cá nhân (CLAUDE.md mục 9.4, 10).
// Mỗi outfit đổi màu tạp dề và có thể thêm mũ, kính, kiểu tóc. Thiết kế riêng của Jamie's Milk Tea.
import type { CharacterDef } from '../art/characters';

export interface OutfitDef {
  id: string;
  name: string;
  /** Giá bằng tiền tip (đồng). 0 = có sẵn. */
  price: number;
  /** Phần thay đổi so với nhân viên mặc định. */
  look: Partial<CharacterDef>;
}

export const DEFAULT_OUTFIT = 'strawberry';

export const OUTFITS: OutfitDef[] = [
  { id: 'strawberry', name: 'Tạp dề dâu', price: 0, look: { accent: '#F28CA8' } },
  { id: 'matcha', name: 'Tạp dề matcha', price: 20_000, look: { accent: '#A7D08C' } },
  { id: 'sky', name: 'Tạp dề trời xanh', price: 20_000, look: { accent: '#6FA8DC' } },
  { id: 'sunny', name: 'Tạp dề nắng vàng', price: 25_000, look: { accent: '#F5C65B' } },
  { id: 'cap', name: 'Mũ lưỡi trai năng động', price: 60_000, look: { accent: '#9A6B45', hat: 'cap' } },
  { id: 'beanie', name: 'Mũ len + kính tròn', price: 90_000, look: { accent: '#B9A6E0', hat: 'beanie', glasses: true } },
  { id: 'bucket', name: 'Mũ tai bèo bạc hà', price: 120_000, look: { accent: '#BFE6D3', hat: 'bucket' } },
  { id: 'bun', name: 'Tóc búi + tạp dề đào', price: 150_000, look: { accent: '#F6A96B', hairStyle: 'bun' } },
];

export function getOutfit(id: string): OutfitDef {
  return OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}

/** Màu đại diện của outfit (chấm màu trong phòng chờ, viền tên). */
export function outfitColor(id: string): string {
  return getOutfit(id).look.accent ?? '#F28CA8';
}
