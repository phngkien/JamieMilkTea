// Âm lượng và bản nhạc nền (bạn có thể chỉnh ở đây).

/** Âm lượng tiếng động (0..1). */
export const SFX_VOLUME = 0.6;
/** Âm lượng nhạc nền (0..1) — để thấp cho dễ chịu. */
export const MUSIC_VOLUME = 0.35;
/** Nhịp độ nhạc nền (nhịp mỗi phút). */
export const MUSIC_BPM = 92;

/** Vòng hợp âm (số nốt MIDI, 60 = Đô giữa): Đô – La thứ – Pha – Son, nhẹ nhàng, vui. */
export const MUSIC_CHORDS: number[][] = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];

/** Giai điệu: mỗi số là một móc đơn, 0 = nghỉ. 32 bước = 4 ô nhịp. */
export const MUSIC_MELODY: number[] = [
  76, 0, 79, 0, 76, 74, 72, 0,
  72, 0, 76, 0, 74, 72, 69, 0,
  69, 0, 72, 0, 74, 0, 72, 69,
  67, 0, 71, 0, 74, 0, 0, 0,
];
