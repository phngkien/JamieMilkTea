// Nâng cấp và đồ trang trí tiệm, mua bằng tiền két (CLAUDE.md mục 9.4).
// Nâng cấp có tác dụng thật; đồ trang trí làm tiệm xinh hơn (vẽ lên cảnh).
// Bạn có thể chỉnh giá, ngày mở và mức tác dụng ở đây.

export interface UpgradeEffects {
  /** Nhân tốc độ giảm kiên nhẫn của khách (0,85 = khách kiên nhẫn lâu hơn 15%). */
  patienceFactor: number;
  /** Thêm số khách mỗi ngày. */
  extraCustomers: number;
  /** Nhân tiền tip. */
  tipFactor: number;
  /** Giảm giá nhập hàng (0,1 = rẻ hơn 10%). */
  restockDiscount: number;
}

export const NO_EFFECTS: UpgradeEffects = { patienceFactor: 1, extraCustomers: 0, tipFactor: 1, restockDiscount: 0 };

export interface UpgradeDef {
  id: string;
  kind: 'upgrade' | 'decor';
  name: string;
  /** Mô tả ngắn hiện trong màn "Tiệm của tôi". */
  desc: string;
  icon: string;
  price: number;
  minDay: number;
  effect: Partial<UpgradeEffects>;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'bench', kind: 'upgrade', name: 'Ghế chờ êm ái', icon: '🪑',
    desc: 'Khách ngồi chờ thoải mái, kiên nhẫn lâu hơn 15%.', price: 300_000, minDay: 2,
    effect: { patienceFactor: 0.85 },
  },
  {
    id: 'tip-jar', kind: 'upgrade', name: 'Hũ tip xinh xắn', icon: '🫙',
    desc: 'Khách vui vẻ cho tip nhiều hơn 25%.', price: 250_000, minDay: 2,
    effect: { tipFactor: 1.25 },
  },
  {
    id: 'supplier', kind: 'upgrade', name: 'Mối nhập hàng quen', icon: '📦',
    desc: 'Nhập nguyên liệu rẻ hơn 10%.', price: 400_000, minDay: 3,
    effect: { restockDiscount: 0.1 },
  },
  {
    id: 'sign', kind: 'upgrade', name: 'Bảng hiệu đèn neon', icon: '💡',
    desc: 'Tiệm nổi bật hơn: thêm 2 khách mỗi ngày (từ ngày hôm sau).', price: 500_000, minDay: 4,
    effect: { extraCustomers: 2 },
  },
  {
    id: 'plant', kind: 'decor', name: 'Chậu cây xanh', icon: '🪴',
    desc: 'Một chậu cây mát mắt ở góc tiệm.', price: 80_000, minDay: 1, effect: {},
  },
  {
    id: 'painting', kind: 'decor', name: 'Tranh mèo uống trà', icon: '🖼️',
    desc: 'Bức tranh nhỏ treo tường, ai nhìn cũng cười.', price: 120_000, minDay: 2, effect: {},
  },
  {
    id: 'flowers', kind: 'decor', name: 'Bình hoa trên quầy', icon: '💐',
    desc: 'Bó hoa tươi đặt trên quầy gỗ.', price: 100_000, minDay: 2, effect: {},
  },
];

export function getUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
