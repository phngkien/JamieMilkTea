// Bảng màu chung của game (CLAUDE.md mục 7). Không dùng đen thuần.
export const PALETTE = {
  cream: '#F8EBDD', // giấy kem
  beige: '#E9D3B8', // be đậm
  woodLight: '#D9AE7E', // gỗ sáng
  woodDark: '#9A6B45', // gỗ đậm
  pink: '#F28CA8', // hồng dâu: mái hiên, nút chính
  pinkLight: '#FBD1DC', // hồng nhạt
  matcha: '#A7D08C',
  mint: '#BFE6D3',
  gold: '#F5C65B', // sao, tiền
  danger: '#E0675C', // cảnh báo đỏ nhạt
  outline: '#6B4A3A', // nâu viền
  text: '#5B3A2E', // chữ nâu
  guide: '#6FA8DC', // thẻ hướng dẫn
  white: '#FFFFFF',
  grey: '#BDB3AA', // ô bị khóa / hết hàng
  glass: '#EAF4F7', // thủy tinh
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Đổi '#RRGGBB' thành số 0xRRGGBB để Phaser dùng. */
export function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}
