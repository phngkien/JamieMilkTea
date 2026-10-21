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
  /** Ly dưới số điểm này thì khách chỉ trả một phần tiền. */
  fullPayFrom: 50,
  /** Ly điểm thấp khách trả bao nhiêu phần giá (0.5 = nửa giá). */
  lowScorePayShare: 0.5,
};

/**
 * Điểm quản lý kho của ngày (0–100), cũng là điểm của trạm Kho & quản lý (CLAUDE.md mục 12).
 * Điểm = 100 − phạt lỡ khách vì hết hàng − phạt đồ bỏ đi − phạt nhập gấp.
 */
export const STOCK_SCORING = {
  /** Mỗi khách bỏ đi vì tiệm hết nguyên liệu món họ gọi. */
  perLostCustomer: 15,
  /** Nhân với tỉ lệ (tiền đồ hết hạn bỏ đi / tiền nguyên liệu đã dùng và bỏ đi). 100 = bỏ 20% thì −20 điểm. */
  wasteWeight: 100,
  /** Mỗi lần nhập gấp giữa giờ. */
  perRush: 3,
};

/**
 * Điểm cá nhân theo trạm (0–100 mỗi trạm). Tổng trọng số mỗi trạm = 100.
 * - Quầy trà: đúng size, đúng loại trà, rót sát giữa vạch xanh.
 * - Kệ topping: đúng đường, đá, topping.
 * - Thu ngân: giao đúng khách đã gọi ly, giao nhanh (kiên nhẫn còn nhiều).
 */
export const STATION_SCORING = {
  tea: { size: 40, teaType: 30, pour: 30 },
  topping: { sugar: 30, ice: 20, topping: 50 },
  cashier: { rightCustomer: 50, speed: 50 },
};

/** Tiền tip của khách hài lòng (CLAUDE.md mục 9.4 và 12). Tip vào tiền cá nhân, không vào két. */
export const TIP = {
  /** Ly dưới số điểm này thì khách không cho tip. */
  minScore: 60,
  /** Tip tối đa = giá ly × tỉ lệ này (ly 100 điểm). */
  rate: 0.2,
  /** Làm tròn tip tới bội số này (đồng). */
  roundTo: 500,
};

/** Bảng xếp hạng cuối ngày và bảng thành tích của tiệm (CLAUDE.md mục 12). */
export const LEADERBOARD = {
  /** Điểm cá nhân của một ly từ mức này trở lên thì tính là "hoàn hảo" (để đếm chuỗi). */
  perfectScore: 90,
  /** Phải làm tối thiểu bấy nhiêu ly mới được xét "Nhân viên xuất sắc". */
  excellentMinCups: 3,
  /** Cần ít nhất bấy nhiêu người làm trong ngày thì mới trao "Nhân viên xuất sắc" (chơi một mình thì không). */
  excellentMinPlayers: 2,
  /** Bảng thành tích của tiệm giữ tối đa bấy nhiêu người. */
  fameLimit: 20,
  /** Phải làm tối thiểu bấy nhiêu ly ở một trạm mới được xét "giỏi nhất trạm". */
  stationMinCups: 10,
};
