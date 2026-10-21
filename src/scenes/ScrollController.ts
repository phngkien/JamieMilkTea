// Cuộn dọc cảnh tiệm bằng camera, có quán tính nhẹ.
// Chỉ bắt đầu cuộn khi chạm vào NỀN (không phải vật thể) — scene quyết định việc đó.
import Phaser from 'phaser';

/** Độ giảm tốc quán tính mỗi giây (càng nhỏ càng trôi xa). */
const FRICTION_PER_SECOND = 0.03;
const MIN_VELOCITY = 0.02;
/** Kéo xa hơn ngần này (đơn vị khung) mới tính là cuộn, tránh rung tay. */
const DRAG_THRESHOLD = 6;

export class ScrollController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private maxScroll = 0;
  private dragging = false;
  private pointerId = -1;
  private startY = 0;
  private startScroll = 0;
  private lastY = 0;
  private lastTime = 0;
  /** Vận tốc: đơn vị khung mỗi mili giây. */
  private velocity = 0;
  private tween: Phaser.Tweens.Tween | null = null;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  setRange(maxScroll: number): void {
    this.maxScroll = Math.max(0, maxScroll);
    this.setScroll(this.camera.scrollY);
  }

  get enabled(): boolean {
    return this.maxScroll > 0;
  }

  get scrollY(): number {
    return this.camera.scrollY;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  private setScroll(y: number): void {
    this.camera.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
  }

  begin(pointer: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    this.stopTween();
    this.dragging = true;
    this.pointerId = pointer.id;
    this.startY = pointer.y;
    this.lastY = pointer.y;
    this.lastTime = performance.now();
    this.startScroll = this.camera.scrollY;
    this.velocity = 0;
  }

  move(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || pointer.id !== this.pointerId) return;
    if (Math.abs(pointer.y - this.startY) < DRAG_THRESHOLD) return;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastTime);
    // Làm mượt vận tốc để thả tay có quán tính tự nhiên
    const instant = -(pointer.y - this.lastY) / dt;
    this.velocity = this.velocity * 0.6 + instant * 0.4;
    this.lastY = pointer.y;
    this.lastTime = now;
    this.setScroll(this.startScroll - (pointer.y - this.startY));
  }

  end(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging || pointer.id !== this.pointerId) return;
    this.dragging = false;
    // Dừng tay lâu trước khi thả thì không trôi
    if (performance.now() - this.lastTime > 100) this.velocity = 0;
  }

  /** Cuộn bằng con lăn chuột. */
  wheel(deltaY: number): void {
    if (!this.enabled) return;
    this.stopTween();
    this.velocity = 0;
    this.setScroll(this.camera.scrollY + deltaY);
  }

  /** Cuộn thêm một đoạn (ví dụ khi kéo ly sát mép màn hình). */
  nudge(amount: number): void {
    this.setScroll(this.camera.scrollY + amount);
  }

  /** Cuộn mượt tới vị trí y. */
  scrollTo(y: number, duration = 450): void {
    if (!this.enabled) return;
    this.stopTween();
    this.velocity = 0;
    const target = Phaser.Math.Clamp(y, 0, this.maxScroll);
    if (Math.abs(target - this.camera.scrollY) < 2) return;
    this.tween = this.scene.tweens.add({
      targets: this.camera,
      scrollY: target,
      duration,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.tween = null;
      },
    });
  }

  private stopTween(): void {
    this.tween?.stop();
    this.tween = null;
  }

  update(deltaMs: number): void {
    if (this.dragging || this.tween || Math.abs(this.velocity) < MIN_VELOCITY) return;
    this.setScroll(this.camera.scrollY + this.velocity * deltaMs);
    this.velocity *= Math.pow(FRICTION_PER_SECOND, deltaMs / 1000);
    // Chạm mép thì dừng
    if (this.camera.scrollY <= 0 || this.camera.scrollY >= this.maxScroll) this.velocity = 0;
  }
}
