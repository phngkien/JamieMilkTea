// Kệ topping lưới 4×3. Thứ tự trong mảng = thứ tự ô trên kệ (trái→phải, trên→dưới).
export interface ToppingDef {
  id: string;
  name: string;
  /** Màu hạt topping (hình tạm). */
  color: string;
  price: number;
}

export const TOPPINGS: ToppingDef[] = [
  { id: 'pearl-black', name: 'Trân châu đen', color: '#4A3128', price: 6000 },
  { id: 'pearl-white', name: 'Trân châu trắng', color: '#F4F1EA', price: 8000 },
  { id: 'jelly', name: 'Thạch dừa', color: '#E8E2C8', price: 6000 },
  { id: 'pudding', name: 'Pudding trứng', color: '#F5D06B', price: 10000 },
  { id: 'red-bean', name: 'Đậu đỏ', color: '#9E3B3B', price: 8000 },
  { id: 'coffee-jelly', name: 'Thạch cà phê', color: '#5C3A24', price: 8000 },
  { id: 'aloe', name: 'Nha đam', color: '#D6EFC4', price: 8000 },
  { id: 'mango-pop', name: 'Trân châu xoài', color: '#FFB547', price: 12000 },
  { id: 'taro-ball', name: 'Khoai môn viên', color: '#B79AD6', price: 10000 },
  { id: 'cheese-cube', name: 'Phô mai viên', color: '#FFE39A', price: 13000 },
  { id: 'lychee', name: 'Vải', color: '#FBE9EE', price: 12000 },
  { id: 'strawberry', name: 'Thạch dâu', color: '#F27C95', price: 9000 },
];

/** Topping được mở sẵn từ đầu. */
export const STARTING_TOPPINGS = ['pearl-black', 'pearl-white', 'jelly'];

export function getTopping(id: string): ToppingDef {
  const topping = TOPPINGS.find((t) => t.id === id);
  if (!topping) throw new Error(`Không có topping "${id}"`);
  return topping;
}
