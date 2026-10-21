// Âm thanh tổng hợp bằng Web Audio — không dùng file âm thanh (CLAUDE.md mục 8).
// Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên: gọi unlock() trong sự kiện chạm.
import { MUSIC_VOLUME, SFX_VOLUME } from '../config/audio';
import { MusicLoop } from './music';

type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pour: { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private music: MusicLoop | null = null;
  private muted = false;
  private musicOn = true;

  constructor(muted: boolean, musicOn: boolean) {
    this.muted = muted;
    this.musicOn = musicOn;
  }

  /** Gọi trong lần chạm đầu tiên của người chơi. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = SFX_VOLUME;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = MUSIC_VOLUME;
    this.musicBus.connect(this.master);
    // Một giây tiếng ồn trắng dùng chung cho tiếng rót, tiếng ép nắp
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    this.music = new MusicLoop(ctx, this.musicBus);
    if (this.musicOn) this.music.start();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isMusicOn(): boolean {
    return this.musicOn;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.03);
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.music) return;
    if (on) this.music.start();
    else this.music.stop();
  }

  /** Tab bị ẩn thì tạm dừng âm thanh cho đỡ tốn pin. */
  suspend(hidden: boolean): void {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ───────────── Khối dựng âm ─────────────

  /** Một nốt có đường bao (attack nhanh, tắt dần). */
  private tone(freq: number, dur: number, opts: { wave?: Wave; vol?: number; delay?: number; slideTo?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.wave ?? 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    const vol = opts.vol ?? 0.4;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Một đoạn tiếng ồn qua bộ lọc (tiếng "tách", "xoẹt"). */
  private burst(dur: number, filterType: BiquadFilterType, freq: number, vol: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ───────────── Tiếng trong game ─────────────

  /** Bắt đầu tiếng rót: tiếng ồn qua bộ lọc band-pass. */
  pourStart(): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noise || this.pour) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 6;
    filter.frequency.value = 350;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.08);
    src.connect(filter).connect(gain).connect(this.sfxBus);
    src.start();
    this.pour = { src, filter, gain };
  }

  /** Cao độ tiếng rót tăng theo mực nước (0..1). */
  pourLevel(fill: number): void {
    if (!this.pour || !this.ctx) return;
    const f = 350 + Math.min(1.1, Math.max(0, fill)) * 1300;
    this.pour.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  }

  pourStop(): void {
    const ctx = this.ctx;
    const p = this.pour;
    if (!ctx || !p) return;
    this.pour = null;
    p.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
    p.src.stop(ctx.currentTime + 0.25);
  }

  /** "Lạch cạch" xúc đá: vài tiếng gõ cao, lệch nhau một chút. */
  ice(): void {
    for (let i = 0; i < 3; i++) {
      this.tone(1800 + Math.random() * 1400, 0.07, { wave: 'triangle', vol: 0.22, delay: i * 0.05 + Math.random() * 0.02 });
    }
    this.burst(0.08, 'highpass', 3000, 0.15);
  }

  /** "Plop" topping rơi vào ly. */
  plop(): void {
    this.tone(520, 0.16, { slideTo: 150, vol: 0.5 });
  }

  /** Giọt nước đường. */
  drip(): void {
    this.tone(900, 0.12, { slideTo: 1500, vol: 0.3 });
  }

  /** "Tách" ép nắp. */
  seal(): void {
    this.burst(0.05, 'highpass', 2500, 0.6);
    this.tone(180, 0.12, { wave: 'square', vol: 0.15, slideTo: 90, delay: 0.02 });
  }

  /** Lấy cốc. */
  pick(): void {
    this.tone(660, 0.08, { wave: 'triangle', vol: 0.25 });
  }

  /** Bỏ ly vào thùng rác. */
  trash(): void {
    this.burst(0.18, 'lowpass', 600, 0.5);
    this.tone(110, 0.2, { slideTo: 60, vol: 0.3 });
  }

  /** Chuông khách vào: "ting–tong". */
  bell(): void {
    this.tone(1320, 0.5, { vol: 0.3 });
    this.tone(990, 0.7, { vol: 0.3, delay: 0.18 });
  }

  /** Tiền vào két. */
  coin(): void {
    this.tone(1046, 0.09, { wave: 'square', vol: 0.12 });
    this.tone(1568, 0.25, { wave: 'square', vol: 0.12, delay: 0.08 });
  }

  /** Hợp âm vui khi khách rất hài lòng. */
  joy(): void {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.5, { wave: 'triangle', vol: 0.22, delay: i * 0.07 }));
  }

  /** Khách buồn / bỏ đi. */
  sad(): void {
    this.tone(392, 0.25, { wave: 'triangle', vol: 0.2 });
    this.tone(311, 0.45, { wave: 'triangle', vol: 0.2, delay: 0.2 });
  }

  /** "Ting" nhắc hết hàng / sắp hết. */
  ting(): void {
    this.tone(2093, 0.6, { vol: 0.22 });
  }

  /** Thao tác không được (nhẹ nhàng, không chói). */
  nope(): void {
    this.tone(220, 0.12, { wave: 'triangle', vol: 0.2 });
    this.tone(185, 0.16, { wave: 'triangle', vol: 0.2, delay: 0.1 });
  }

  /** Bấm nút giao diện. */
  click(): void {
    this.tone(880, 0.05, { wave: 'triangle', vol: 0.15 });
  }

  /** Mở cửa / sang ngày mới. */
  fanfare(): void {
    [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.35, { wave: 'triangle', vol: 0.2, delay: i * 0.12 }));
  }
}
