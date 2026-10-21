// Toàn bộ chữ hiển thị trong game (tiếng Việt có dấu).
import type { IceLevel, RejectReason } from '../core/types';

export const SHOP_NAME = "Jamie's Milk Tea";

/**
 * Mẫu câu gọi món. Biến:
 * {n} số ly, {tea} tên trà, {size} M/L, {toppings} ", thêm ..." hoặc rỗng,
 * {sugar} "50% đường" / "không đường", {ice} "ít đá" / ...
 */
export const ORDER_TEMPLATES = [
  'Bạn ơi, cho mình {n} ly {tea} size {size}{toppings}, {sugar} và {ice} nha!',
  'Cho em {n} ly {tea} size {size}{toppings}, {sugar}, {ice} ạ!',
  'Mình muốn {n} ly {tea} size {size}{toppings}. Nhớ {sugar} với {ice} nhé!',
  'Hôm nay nóng quá! Cho mình {n} ly {tea} size {size}{toppings}, {sugar} và {ice} nha.',
  'Một ly {tea} size {size}{toppings} nhé, {sugar}, {ice}. Cảm ơn nhiều!',
];

/** Câu cho order nhiều ly: mỗi ly một dòng "Ly k: ...". */
export const ORDER_MULTI_INTRO = 'Cho mình {n} ly nha:';
export const ORDER_CUP_LINE = 'Ly {k}: {tea} size {size}{toppings}, {sugar}, {ice}.';

export const SUGAR_TEXT = {
  zero: 'không đường',
  percent: '{p}% đường',
};

export const ICE_TEXT: Record<IceLevel, string> = {
  none: 'không đá',
  less: 'ít đá',
  normal: 'đá bình thường',
};

export const TOPPING_TEXT = {
  prefix: ', thêm ',
  joiner: ' và ',
  double: '2 phần {name}',
};

export const STATUS_TEXT = {
  sugar: 'Đường {p}%',
  sugarNone: 'Đường —',
  separator: ' · ',
  ruined: 'Ly bị tràn — kéo vào thùng rác',
  sealed: 'Đã ép nắp',
};

export const UI_TEXT = {
  day: 'Ngày {n}',
  noRating: 'Chưa có đánh giá',
  rating: '{avg} · {count} đánh giá',
  patience: 'KIÊN NHẪN',
  cupTab: 'Ly {k}',
  teaCounter: 'Quầy trà',
  brewArea: 'Pha ly',
  toppingShelf: 'Topping',
  stock: 'Kho',
  serve: 'Giao',
  trash: 'Thùng rác',
  ice: 'Đá viên',
  syrup: 'Nước đường',
  sealer: 'Máy ép nắp',
  soldOut: 'Hết',
  board: 'Chạm cốc M hoặc L\nđể lấy ly',
  comingSoon: 'Foam và siro: sắp mở!',
  scoreLine: '{score} điểm',
  waitingCustomer: 'Đang chờ khách...',
  skipTutorial: 'Bỏ qua',
  cupStack: 'Cốc {size}',
  ruined: 'Hỏng!',
  staffName: 'Bạn',
};

export const REJECT_TEXT: Record<RejectReason, string> = {
  boardFull: 'Bảng gỗ đã có ly rồi',
  noCup: 'Lấy cốc trước đã nhé',
  differentTea: 'Ly này đã có loại trà khác rồi',
  sugarMax: 'Đường 100% là tối đa rồi',
  iceMax: 'Đá đã đầy rồi',
  toppingMax: 'Mỗi loại tối đa 2 muỗng thôi',
  toppingTypesMax: 'Mỗi ly tối đa 2 loại topping',
  locked: 'Món này chưa mở khóa',
  sealed: 'Ly đã ép nắp rồi',
  ruined: 'Ly bị hỏng rồi, bỏ vào thùng rác nhé',
  notSealed: 'Ép nắp trước khi giao nhé',
  noCustomer: 'Chưa có khách để giao',
  emptyCup: 'Ly còn rỗng, rót trà trước nhé',
  outOfStock: 'Hết hàng rồi! Vào Kho để nhập thêm',
  noMoney: 'Két không đủ tiền',
  tooEarly: 'Chưa tới ngày mở được món này',
  alreadyUnlocked: 'Món này đã mở rồi',
  dayClosed: 'Tiệm đã đóng cửa',
  stationBusy: 'Trạm đó đang có ly rồi',
  notYourStation: 'Đây là trạm của bạn khác',
  notOwner: 'Chỉ chủ tiệm mới được chi tiền két',
  alreadyOwned: 'Tiệm đã có món này rồi',
  unknown: 'Không làm được',
};

/** Màn Kho. */
export const STOCK_TEXT = {
  title: 'Kho hàng',
  cash: 'Két: {cash}',
  ingredients: 'Nguyên liệu',
  newItems: 'Món mới',
  inStock: 'Còn {n}',
  restock: 'Nhập +{n} · {price}',
  unlock: 'Mở khóa · {price}',
  fromDay: 'Từ ngày {day}',
  unlockGift: 'Tặng kèm 1 gói khi mở',
  tea: 'Trà',
  topping: 'Topping',
  close: 'Đóng',
  restocked: 'Đã nhập +{n} {name}',
  unlocked: 'Đã mở khóa {name}!',
  lowWarning: '{name} sắp hết!',
  outWarning: '{name} đã hết!',
};

/** Bảng "Hết ngày N". */
export const SUMMARY_TEXT = {
  title: 'Hết ngày {day}',
  customers: 'Khách đã phục vụ',
  unhappy: 'Khách không vui',
  stars: 'Sao trong ngày',
  revenue: 'Doanh thu',
  costs: 'Chi phí',
  ingredients: 'Nguyên liệu đã dùng ({n} ly)',
  waste: 'Hao phí: {n} ly hỏng / bỏ',
  rent: 'Tiền thuê tiệm',
  profit: 'Lãi',
  loss: 'Lỗ',
  cashTitle: 'Két',
  cashStart: 'Két đầu ngày',
  cashRevenue: 'Tiền bán ly',
  cashRestock: 'Nhập hàng',
  cashUnlock: 'Mở khóa món mới',
  cashUpgrade: 'Nâng cấp, trang trí',
  myTips: 'Tip của bạn hôm nay',
  teamTitle: 'Công sức hôm nay',
  teamCups: '{n} ly',
  cashRent: 'Tiền thuê tiệm',
  cashEnd: 'Két cuối ngày',
  next: 'Ngày {day} →',
  closing: 'Hết giờ! Phục vụ nốt khách còn lại rồi đóng cửa nhé',
};

/** Cài đặt và chơi lại. */
export const SETTINGS_TEXT = {
  title: 'Cài đặt',
  tutorial: 'Bật lại hướng dẫn',
  sound: 'Âm thanh',
  music: 'Nhạc nền',
  reducedMotion: 'Giảm chuyển động',
  on: 'Bật',
  off: 'Tắt',
  tutorialOn: 'Đã bật lại hướng dẫn cho khách tiếp theo',
  reset: 'Chơi lại từ đầu',
  resetConfirm1: 'Chơi lại từ đầu sẽ xóa hết tiến trình: ngày, két, kho, món đã mở. Bạn chắc chứ?',
  resetConfirm2: 'Hỏi lần cuối nhé: xóa hết và chơi lại từ Ngày 1?',
  resetYes1: 'Có, chơi lại',
  resetYes2: 'Xóa hết thật',
  cancel: 'Thôi',
  close: 'Đóng',
  welcomeBack: 'Chào mừng quay lại! Ngày {day}',
  savedLocally: 'Tiến trình được lưu trên máy này.',
};

export const EVENT_TEXT = {
  ruined: 'Ôi, tràn ly mất rồi!',
  customerLeft: '{name} chờ lâu quá nên bỏ đi rồi...',
  discarded: 'Đã bỏ ly vào thùng rác',
  sealed: 'Bập! Đã ép nắp',
};

/** Hướng dẫn lần đầu (thẻ xanh dương). {k} là số thứ tự bước. */
export const TUTORIAL_TEXT = {
  pickCup: 'Bước {k}: chạm chồng cốc {size}',
  pour: 'Bước {k}: nhấn giữ bình {tea}, thả tay khi tới vạch xanh',
  sugar: 'Bước {k}: chạm Nước đường {times} lần ({p}% đường)',
  ice: 'Bước {k}: chạm Đá viên {times} lần ({ice})',
  topping: 'Bước {k}: chạm hũ {name} {times} lần',
  seal: 'Bước {k}: kéo ly vào máy ép nắp',
  serve: 'Bước {k}: kéo ly tới khách hoặc chạm nút Giao',
  ruined: 'Ly bị tràn rồi: kéo ly vào thùng rác rồi làm lại nhé',
};

/** Chơi cùng bạn bè (phòng nhiều người). */
export const ROOM_TEXT = {
  invite: 'Mời bạn',
  menuTitle: 'Chơi cùng bạn bè',
  menuHint: 'Tối đa 4 người, ở xa hay ở gần đều được. Cần có mạng.',
  create: 'Mở tiệm cho bạn bè',
  join: 'Vào tiệm bạn',
  yourName: 'Tên của bạn',
  namePlaceholder: 'Ví dụ: Jamie',
  code: 'Mã phòng',
  codePlaceholder: 'Ví dụ: ABC234',
  createButton: 'Tạo phòng',
  joinButton: 'Vào tiệm',
  back: 'Quay lại',
  connecting: 'Đang kết nối...',
  lobbyTitle: 'Tiệm của {owner}',
  shareHint: 'Gửi mã hoặc link này cho bạn bè:',
  copy: 'Sao chép lời mời',
  copied: 'Đã sao chép lời mời!',
  inviteMessage: "Vào chơi Jamie's Milk Tea với mình nhé! Mã phòng: {code}\n{link}",
  players: 'Người trong tiệm ({n}/4)',
  chooseStation: 'Chọn trạm của bạn',
  stationTaken: 'của {name}',
  stationFree: 'Còn trống',
  stationMine: 'Trạm của bạn',
  mergedWith: 'Đang gộp: {list}',
  open: 'Mở cửa!',
  waitHost: 'Chờ chủ phòng mở cửa...',
  waitNextDay: 'Chờ chủ phòng sang ngày mới...',
  leave: 'Rời phòng',
  close: 'Đóng',
  host: 'chủ phòng',
  offline: 'mất mạng',
  you: 'bạn',
  errNotFound: 'Không tìm thấy tiệm có mã này',
  errFull: 'Tiệm đã đủ người',
  errOffline: 'Không kết nối được. Kiểm tra mạng rồi thử lại nhé',
  errName: 'Nhập tên của bạn trước nhé',
  errCode: 'Mã phòng gồm 6 ký tự',
  errCreate: 'Không tạo được phòng, thử lại nhé',
  joined: '{name} đã vào tiệm',
  left: '{name} đã rời tiệm',
  newHost: '{name} giờ là chủ phòng',
  youAreHost: 'Bạn giờ là chủ phòng',
  pass: 'Chuyền →',
  notYours: 'Đây là trạm {station} của {name}',
  lostConnection: 'Mất kết nối, đang thử lại...',
  backOnline: 'Đã kết nối lại',
};

export const STATION_NAMES: Record<'cashier' | 'tea' | 'topping' | 'stock', string> = {
  cashier: 'Thu ngân',
  tea: 'Quầy trà',
  topping: 'Kệ topping',
  stock: 'Kho & quản lý',
};

export const STATION_JOBS: Record<'cashier' | 'tea' | 'topping' | 'stock', string> = {
  cashier: 'Ép nắp, giao ly cho khách',
  tea: 'Lấy cốc, rót trà',
  topping: 'Đường, đá, topping',
  stock: 'Nhập hàng, mở khóa món',
};

export const EMOTE_TEXT: Record<'heart' | 'smile' | 'thumb' | 'hurry', string> = {
  heart: '❤️',
  smile: '😄',
  thumb: '👍',
  hurry: 'Nhanh lên!',
};

/** Thay {key} trong mẫu câu bằng giá trị. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
