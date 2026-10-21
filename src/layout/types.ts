// Toạ độ mọi vật thể trên cảnh tiệm. Đơn vị: điểm ảnh của khung thiết kế (1080 dọc / 1920 ngang).

/** Hình chữ nhật, (x, y) là góc trên bên trái. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Label {
  key: 'teaCounter' | 'brewArea' | 'toppingShelf';
  x: number;
  y: number;
}

export interface ShopLayout {
  kind: 'portrait' | 'landscape';
  /** Kích thước khung nhìn (game size). */
  viewWidth: number;
  viewHeight: number;
  /** Chiều cao toàn cảnh (cuộn được nếu lớn hơn viewHeight). */
  worldHeight: number;
  /** Chiều cao thanh HUD (DOM) phủ trên cùng, tính theo đơn vị khung. */
  hudHeight: number;
  /** Chiều cao thanh nhảy nhanh phía dưới (0 = không có). */
  navHeight: number;
  /** Hệ số cỡ chữ / nút DOM so với bố cục dọc. */
  uiScale: number;
  awning: Rect;
  queue: Rect;
  customer: Rect;
  bubble: Rect;
  labels: Label[];
  /** Mặt quầy dưới hàng bình trà. */
  teaShelf: Rect;
  dispensers: Rect[];
  cupStacks: { M: Rect; L: Rect };
  sealer: Rect;
  board: Rect;
  /** Điểm giữa đáy ly trên bảng gỗ. */
  cupSpot: { x: number; y: number };
  /** Chiều cao ly theo size (rộng = cao × 0,72). */
  cupHeight: { M: number; L: number };
  statusText: { x: number; y: number; width: number };
  trash: Rect;
  ice: Rect;
  syrup: Rect;
  serveButton: Rect;
  toppingShelf: Rect;
  toppings: Rect[];
  /** Kệ foam / siro (chưa mở ở Prompt 1). */
  comingSoon: Rect;
  /** Quầy gỗ cuối cảnh. */
  floor: Rect;
  /** Các vùng nền: tường khách, quầy trà, mặt bàn pha, kệ topping. */
  zones: { customer: Rect; tea: Rect; brew: Rect; topping: Rect };
  /** Góc trang trí (kệ cây, cửa sổ nhỏ) ở vùng khách. */
  decor: Rect;
  /** Quầy gỗ ngăn giữa khách và tiệm. */
  counterStrip: Rect;
  /** Nhân viên (người chơi) đứng ở đây. */
  worker: Rect;
  /** Vị trí cuộn (scrollY) cho các nút nhảy nhanh. */
  sections: { tea: number; brew: number; topping: number };
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function inRect(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

/** Chia một hàng thành n ô đều nhau. */
export function row(x: number, y: number, w: number, h: number, n: number, gap: number): Rect[] {
  const cellW = (w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: x + i * (cellW + gap), y, w: cellW, h }));
}

/** Chia một lưới cols × rows. Thứ tự: trái→phải, trên→dưới. */
export function grid(area: Rect, cols: number, rows: number, gap: number): Rect[] {
  const cellH = (area.h - gap * (rows - 1)) / rows;
  const cells: Rect[] = [];
  for (let r = 0; r < rows; r++) cells.push(...row(area.x, area.y + r * (cellH + gap), area.w, cellH, cols, gap));
  return cells;
}
