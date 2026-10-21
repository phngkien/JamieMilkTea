// Các loại trà. Giá tính bằng đồng (25000 = 25k).
export interface TeaDef {
  id: string;
  name: string;
  /** Màu nước trà trong ly (hình tạm). */
  color: string;
  price: number;
}

export const TEAS: TeaDef[] = [
  { id: 'milk', name: 'Trà sữa', color: '#C9A27C', price: 25000 },
  { id: 'matcha', name: 'Matcha', color: '#9CC47A', price: 30000 },
  { id: 'black', name: 'Hồng trà', color: '#B8644A', price: 25000 },
  { id: 'green', name: 'Lục trà', color: '#C9D77A', price: 25000 },
  { id: 'oolong', name: 'Ô long', color: '#B98B4E', price: 28000 },
  { id: 'peach', name: 'Trà đào', color: '#F2A86F', price: 30000 },
];

/** Trà được mở sẵn từ đầu. */
export const STARTING_TEAS = ['milk', 'matcha', 'black'];

export function getTea(id: string): TeaDef {
  const tea = TEAS.find((t) => t.id === id);
  if (!tea) throw new Error(`Không có trà "${id}"`);
  return tea;
}
