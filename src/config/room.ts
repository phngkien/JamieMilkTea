// Thông số phòng chơi chung (thời gian tính bằng mili giây).
export const ROOM = {
  maxPlayers: 4,
  codeLength: 6,
  /** Phòng cũ hơn mức này thì được dọn khi chủ phòng tạo phòng mới. */
  maxAgeMs: 24 * 60 * 60 * 1000,
  /** Host ghi state định kỳ (để đồng hồ, kiên nhẫn chạy đều trên máy khác). */
  stateWriteEveryMs: 250,
  /** Sau một thao tác, host ghi state sớm nhất sau chừng này (gộp nhiều thao tác liên tiếp). */
  stateWriteAfterActionMs: 50,
  /** Người đang rót gửi lượng trà bao lâu một lần (~10 lần/giây). */
  liveEveryMs: 100,
  /** Host offline quá lâu thì người vào sớm nhất còn lại làm host. */
  hostTimeoutMs: 5000,
  /** Người chơi offline quá lâu thì trạm được nhả cho người khác. */
  releaseStationAfterMs: 20000,
  /** Biểu cảm tự xóa sau chừng này. */
  emoteLifetimeMs: 4000,
};
