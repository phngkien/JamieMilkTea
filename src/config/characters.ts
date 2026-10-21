// Danh sách nhân vật (khách). Mỗi người một kiểu tóc, trang phục, phụ kiện riêng.
// Đây là thiết kế riêng của Jamie's Milk Tea.
import type { CharacterDef } from '../art/characters';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'na',
    name: 'Bé Na',
    skin: '#FBE0CC',
    hair: '#4A3328',
    hairStyle: 'bob',
    outfit: 'overalls',
    outfitColor: '#FFF3C9',
    accent: '#F28CA8',
    eyes: '#4A3328',
    freckles: true,
  },
  {
    id: 'khang',
    name: 'Minh Khang',
    skin: '#F3D2B8',
    hair: '#2F2622',
    hairStyle: 'short',
    outfit: 'hoodie',
    outfitColor: '#9CC9A6',
    accent: '#FFFFFF',
    eyes: '#3B2A22',
    glasses: true,
  },
];
