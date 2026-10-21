// Lưu trên cloud (Firebase) và tài khoản. Thời gian tính bằng mili giây.
export const CLOUD = {
  /** Sau khi lưu trên máy, chờ chừng này rồi mới đẩy lên cloud (gộp nhiều lần lưu liên tiếp). */
  pushDelayMs: 3000,
  /** Mã tài khoản (để đăng nhập trên máy khác) dài bao nhiêu ký tự. */
  loginCodeLength: 8,
  /**
   * Mã tài khoản được đổi thành một "email giả" để dùng tính năng Email/Mật khẩu của Firebase.
   * Không bao giờ gửi thư tới địa chỉ này (example.com là tên miền dành riêng cho ví dụ).
   */
  loginEmailDomain: 'jamie.example.com',
};
