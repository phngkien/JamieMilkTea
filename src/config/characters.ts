// Danh sách nhân vật (khách) và nhân viên. Mỗi người một kiểu tóc, trang phục, phụ kiện riêng.
// Đây là thiết kế riêng của Jamie's Milk Tea.
import type { CharacterDef } from '../art/characters';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'na', name: 'Bé Na', skin: '#FBE0CC', hair: '#4A3328', hairStyle: 'bob',
    outfit: 'overalls', outfitColor: '#FFF3C9', accent: '#F28CA8', eyes: '#4A3328', freckles: true,
  },
  {
    id: 'khang', name: 'Minh Khang', skin: '#F3D2B8', hair: '#2F2622', hairStyle: 'short',
    outfit: 'hoodie', outfitColor: '#9CC9A6', accent: '#FFFFFF', eyes: '#3B2A22', glasses: true,
  },
  {
    id: 'vy', name: 'Thảo Vy', skin: '#F8DCC8', hair: '#3A2A2A', hairStyle: 'long',
    outfit: 'aodai', outfitColor: '#C8B6E8', accent: '#F5C65B', eyes: '#3A2A2A',
  },
  {
    id: 'bao', name: 'Gia Bảo', skin: '#E9BE98', hair: '#3B2B24', hairStyle: 'spiky',
    outfit: 'tee', outfitColor: '#F6A96B', accent: '#6FA8DC', eyes: '#2E2420', hat: 'cap',
  },
  {
    id: 'mai', name: 'Ngọc Mai', skin: '#FBE3D2', hair: '#5A3B2A', hairStyle: 'ponytail',
    outfit: 'uniform', outfitColor: '#FFFFFF', accent: '#4F6E9E', eyes: '#4A3328',
  },
  {
    id: 'tuan', name: 'Tuấn Anh', skin: '#D9A882', hair: '#2A211D', hairStyle: 'curly',
    outfit: 'shirt', outfitColor: '#A9CBEA', accent: '#FFFFFF', eyes: '#2A211D',
  },
  {
    id: 'linh', name: 'Khánh Linh', skin: '#F6D5BE', hair: '#7A4B2E', hairStyle: 'bun',
    outfit: 'sweater', outfitColor: '#F7B6C8', accent: '#FFFFFF', eyes: '#5A3B2A', glasses: true,
  },
  {
    id: 'dang', name: 'Hải Đăng', skin: '#EFC7A6', hair: '#3E2C23', hairStyle: 'short',
    outfit: 'tee', outfitColor: '#A7D08C', accent: '#F5C65B', eyes: '#3E2C23', hat: 'beanie',
  },
  {
    id: 'ngan', name: 'Bích Ngân', skin: '#F3CDB0', hair: '#2C2420', hairStyle: 'braids',
    outfit: 'hoodie', outfitColor: '#B9A6E0', accent: '#FBD1DC', eyes: '#2C2420', freckles: true,
  },
  {
    id: 'tu', name: 'Bác Tư', skin: '#EBC4A2', hair: '#D8D2CC', hairStyle: 'short',
    outfit: 'shirt', outfitColor: '#E9D3B8', accent: '#FFFFFF', eyes: '#3B2A22', glasses: true, hat: 'bucket',
  },
];

/** Nhân viên (người chơi): tạp dề đổi màu theo outfit. */
export const STAFF: CharacterDef = {
  id: 'staff', name: 'Bạn', skin: '#FBE0CC', hair: '#5A3B2A', hairStyle: 'ponytail',
  outfit: 'apron', outfitColor: '#FFF7EF', accent: '#F28CA8', eyes: '#4A3328',
};

