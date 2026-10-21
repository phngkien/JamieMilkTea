// Nhạc nền nhẹ: vòng lặp ngắn tổng hợp bằng code (hợp âm + giai điệu + tiếng trống nhẹ).
// Dùng bộ hẹn giờ "nhìn trước" để nốt nhạc rơi đúng nhịp kể cả khi trình duyệt bận.
import { MUSIC_BPM, MUSIC_CHORDS, MUSIC_MELODY } from '../config/audio';

/** Đổi số nốt MIDI thành tần số (69 = La 440Hz). */
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

const LOOKAHEAD_S = 0.3;
const TICK_MS = 100;

export class MusicLoop {
  private ctx: AudioContext;
  private out: GainNode;
  private timer = 0;
  private step = 0;
  private nextTime = 0;

  constructor(ctx: AudioContext, out: GainNode) {
    this.ctx = ctx;
    this.out = out;
  }

  start(): void {
    if (this.timer) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  /** Mỗi bước = một móc đơn (1/8 nhịp). Một ô nhịp 8 bước, mỗi hợp âm một ô. */
  private schedule(): void {
    const stepDur = 60 / MUSIC_BPM / 2;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_S) {
      const totalSteps = MUSIC_CHORDS.length * 8;
      const s = this.step % totalSteps;
      const chord = MUSIC_CHORDS[Math.floor(s / 8)];
      const t = this.nextTime;
      if (s % 8 === 0) {
        // Hợp âm nền ngân dài cả ô nhịp
        chord.forEach((n) => this.note(midi(n), t, stepDur * 8, 0.06, 'sine'));
        this.note(midi(chord[0] - 12), t, stepDur * 4, 0.1, 'triangle');
      }
      if (s % 8 === 4) this.note(midi(chord[0] - 12), t, stepDur * 3, 0.08, 'triangle');
      const m = MUSIC_MELODY[s % MUSIC_MELODY.length];
      if (m > 0) this.note(midi(m), t, stepDur * 1.6, 0.07, 'triangle');
      // Tiếng "lắc" nhẹ ở phách lẻ
      if (s % 2 === 1) this.shaker(t);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private note(freq: number, t: number, dur: number, vol: number, wave: OscillatorType): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private shaker(t: number): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 6000 + Math.random() * 2000;
    gain.gain.setValueAtTime(0.012, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + 0.05);
  }
}
