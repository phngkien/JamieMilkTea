// Điểm ly 0–100 (CLAUDE.md mục 12). Tổng các phần = 100.
export const SCORING = {
  size: 10,
  /** Trà đúng loại + độ chính xác khi rót. */
  tea: 25,
  /** Phần của 25 điểm trà dành cho "đúng loại"; phần còn lại cho độ chính xác vạch rót. */
  teaTypeShare: 0.4,
  sugar: 15,
  ice: 10,
  topping: 20,
  patience: 20,
  /** Sai size hoặc sai loại trà thì tổng tối đa bằng số này. */
  wrongBaseCap: 40,
  /** Lệch một mức đường / đá thì được tỉ lệ này. */
  oneStepOffShare: 0.4,
  /** Đúng loại topping nhưng sai số muỗng thì được tỉ lệ này. */
  wrongScoopsShare: 0.5,
  /** Rót trúng mép vùng xanh còn được tỉ lệ này (giữa vùng xanh = 1). */
  pourEdgeAccuracy: 0.7,
  /** Lệch ra ngoài vùng xanh bao nhiêu lần bề rộng nửa vùng thì về 0. */
  pourFalloffHalfZones: 2,
  /** Sao = điểm / starDivisor, làm tròn. */
  starDivisor: 20,
  /** Dưới mức này là khách không vui. */
  unhappyBelow: 50,
  /** Khách bỏ đi thì để lại số sao này. */
  leaveStars: 1,
};
