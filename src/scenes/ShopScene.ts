// Cảnh tiệm duy nhất. Scene chỉ ĐỌC state để vẽ và GỬI action khi người chơi thao tác;
// mọi luật chơi nằm trong src/core.
import Phaser from 'phaser';
import { OVERFLOW_AT, SIZES } from '../config/cup';
import {
  LOW_STOCK_AT,
  STOCK_ICE,
  STOCK_SUGAR,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
} from '../config/inventory';
import { PALETTE, hex } from '../config/palette';
import { EVENT_TEXT, REJECT_TEXT, STATUS_TEXT, SUMMARY_TEXT, UI_TEXT, fill } from '../config/strings';
import { TEAS } from '../config/teas';
import { TOPPINGS } from '../config/toppings';
import { describeCupStatus } from '../core/brewing';
import { formatMoney } from '../core/economy';
import type { Customer as CustomerData, CupState, GameEvent, ShopState } from '../core/types';
import type { Sfx } from '../audio/Sfx';
import { Ambience } from '../entities/Ambience';
import { Cup } from '../entities/Cup';
import { Customer } from '../entities/Customer';
import { CupStack } from '../entities/CupStack';
import { box, label, text } from '../entities/draw';
import { IceBin } from '../entities/IceBin';
import { OrderBubble } from '../entities/OrderBubble';
import type { Prop } from '../entities/Prop';
import { QueueStrip } from '../entities/QueueStrip';
import { SealMachine } from '../entities/SealMachine';
import { ServeButton } from '../entities/ServeButton';
import { SyrupPump } from '../entities/SyrupPump';
import { TeaDispenser } from '../entities/TeaDispenser';
import { ToppingJar } from '../entities/ToppingJar';
import { TrashBin } from '../entities/TrashBin';
import { Worker } from '../entities/Worker';
import { inRect, type Rect, type ShopLayout } from '../layout';
import type { NetAdapter } from '../net/NetAdapter';
import type { Overlay } from '../ui/overlay';
import type { Section } from '../ui/quickNav';
import { currentTutorialStep, type TutorialTarget } from '../ui/tutorial';
import { backgroundChunks, coinArt, starArt, textureRequests, ts as textScaleOf } from './artCatalog';
import { ScrollController } from './ScrollController';
import { ensureTextures } from './textures';

/** Kéo ly sát mép trên/dưới màn hình (đơn vị khung) thì cảnh tự cuộn theo. */
const EDGE_SCROLL_ZONE = 160;
const EDGE_SCROLL_SPEED = 1.1; // đơn vị khung mỗi ms

/** Lớp vẽ (depth): nền < vật thể < ly đang kéo < hiệu ứng < viền hướng dẫn. */
const DEPTH = { background: -10, props: 0, customer: 1, cup: 2, stream: 3, dragging: 10, fx: 20, highlight: 30 };

interface PourState {
  cupId: string;
  tea: string;
  amount: number;
  pointerId: number;
  dispenser: TeaDispenser;
}

export class ShopScene extends Phaser.Scene {
  private adapter!: NetAdapter;
  private overlay!: Overlay;
  private layout!: ShopLayout;
  /** Hệ số cỡ chữ trên canvas: bố cục ngang chữ nhỏ hơn. */
  private ts = 1;
  private scroll!: ScrollController;
  private sfx!: Sfx;
  private ambience!: Ambience;
  /** Texture đã tạo xong và cảnh đã dựng. */
  private ready = false;

  private dispensers: TeaDispenser[] = [];
  private cupStacks: CupStack[] = [];
  private toppingJars: ToppingJar[] = [];
  private sealer!: SealMachine;
  private trash!: TrashBin;
  private ice!: IceBin;
  private syrup!: SyrupPump;
  private serveButton!: ServeButton;
  private bubble!: OrderBubble;
  private queue!: QueueStrip;
  private worker!: Worker;
  private statusText!: Phaser.GameObjects.Text;
  private statusBg!: Phaser.GameObjects.Graphics;
  private boardHint!: Phaser.GameObjects.Text;
  private stream!: Phaser.GameObjects.Graphics;
  private highlight!: Phaser.GameObjects.Graphics;

  private customerView: Customer | null = null;
  private cupView: Cup | null = null;
  private pour: PourState | null = null;
  private dragPointer: Phaser.Input.Pointer | null = null;
  private lastJar: ToppingJar | null = null;
  /** Tâm trạng tạm thời sau khi giao ly (vui / buồn) — đè lên tâm trạng theo kiên nhẫn. */
  private moodOverride: { id: string; mood: 'happy' | 'sad' } | null = null;
  private lastTutorialKey = '';
  private lastQueueKey = '';
  private lastStatus = '';
  private activeSection: Section | null = null;
  /** Các vật có nhãn số tồn, kèm mã nguyên liệu trong kho. */
  private stockProps: { prop: Prop; stockId: string }[] = [];
  private lastPhase: ShopState['phase'] | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super('Shop');
  }

  /** Người chơi bật "Giảm chuyển động" hoặc máy đặt prefers-reduced-motion. */
  private get reducedMotion(): boolean {
    return this.registry.get('reducedMotion') === true;
  }

  create(): void {
    this.adapter = this.registry.get('adapter') as NetAdapter;
    this.overlay = this.registry.get('overlay') as Overlay;
    this.layout = this.registry.get('layout') as ShopLayout;
    this.sfx = this.registry.get('sfx') as Sfx;
    this.ts = textScaleOf(this.layout);
    this.resetFields();

    this.scroll = new ScrollController(this);
    this.scroll.setRange(this.layout.worldHeight - this.layout.viewHeight);
    // Dựng lại cảnh (ví dụ sau khi mở khóa món mới) thì giữ nguyên chỗ đang xem
    const keepScroll = this.registry.get('scrollY') as number | undefined;
    if (typeof keepScroll === 'number') {
      this.scroll.nudge(keepScroll);
      this.registry.remove('scrollY');
    }
    this.overlay.onJump = (section) => this.scroll.scrollTo(this.layout.sections[section]);
    this.overlay.onSkipTutorial = () => this.finishTutorial();

    // Vẽ hình SVG thành texture (lần đầu mất khoảng một giây), xong mới dựng cảnh
    const loading = text(this, this.layout.viewWidth / 2, this.scroll.scrollY + this.layout.viewHeight / 2, '…', {
      size: 80,
      title: true,
      color: PALETTE.pink,
    });
    void ensureTextures(this, textureRequests(this.layout, this.adapter.getState())).then(() => {
      if (!this.sys.isActive()) return;
      loading.destroy();
      this.build();
    });
  }

  private build(): void {
    this.drawBackground();
    this.createProps();
    this.setupInput();
    this.unsubscribe = this.adapter.subscribe((state, events) => this.handleEvents(state, events));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
      // Dựng lại cảnh giữa lúc đang rót thì tắt tiếng rót
      this.sfx.pourStop();
    });
    // Vẽ ngay khách đang có (không chạy hiệu ứng đi vào khi đổi bố cục)
    this.syncView(this.adapter.getState(), false);
    this.ready = true;
  }

  /** Scene được khởi động lại khi xoay máy: xóa tham chiếu cũ. */
  private resetFields(): void {
    this.ready = false;
    this.dispensers = [];
    this.cupStacks = [];
    this.toppingJars = [];
    this.customerView = null;
    this.cupView = null;
    this.pour = null;
    this.dragPointer = null;
    this.lastJar = null;
    this.lastTutorialKey = '';
    this.lastQueueKey = '';
    this.lastStatus = '';
    this.activeSection = null;
    this.stockProps = [];
    this.lastPhase = null;
  }

  // ───────────────────────── Vẽ cảnh tĩnh ─────────────────────────

  private drawBackground(): void {
    const L = this.layout;
    for (const chunk of backgroundChunks(L)) {
      this.add.image(0, chunk.y, chunk.key).setOrigin(0, 0).setDepth(DEPTH.background);
    }
    // Nhãn các vùng: bảng gỗ có chữ
    for (const l of L.labels) {
      const t = text(this, 0, 0, UI_TEXT[l.key], { size: 38 * this.ts, title: true });
      const w = t.width + 56;
      const h = 64 * this.ts;
      t.destroy();
      label(this, l.x + w / 2, l.y + h / 2, w, h, UI_TEXT[l.key], this.ts * 1.3, PALETTE.beige).setDepth(DEPTH.props);
    }
    const c = L.comingSoon;
    label(this, c.x + c.w / 2, c.y + c.h / 2, Math.min(c.w * 0.8, 520 * this.ts), 56 * this.ts, UI_TEXT.comingSoon, this.ts, PALETTE.white).setDepth(DEPTH.props);

    // Dòng trạng thái dưới ly
    this.statusBg = this.add.graphics().setDepth(DEPTH.props);
    this.statusText = text(this, L.statusText.x, L.statusText.y, '', { size: 34 * this.ts, title: true }).setDepth(DEPTH.props);
    const b = L.board;
    this.boardHint = text(this, b.x + b.w / 2, b.y + b.h / 2, UI_TEXT.board, {
      size: 38 * this.ts,
      color: '#8A5F3E',
      title: true,
    }).setDepth(DEPTH.props);
  }

  private createProps(): void {
    const L = this.layout;
    const state = this.adapter.getState();

    L.dispensers.forEach((rect, i) => {
      const tea = TEAS[i];
      if (!tea) return;
      const d = new TeaDispenser(this, L, rect, tea, !state.unlockedTeas.includes(tea.id), this.ts);
      d.hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startPour(d, pointer));
      this.dispensers.push(d);
      if (!d.locked) this.stockProps.push({ prop: d, stockId: stockIdOfTea(tea.id) });
    });

    for (const size of ['M', 'L'] as const) {
      const stack = new CupStack(this, L, size, this.ts);
      stack.onTap(() => {
        stack.pop();
        this.adapter.dispatch({ type: 'PICK_CUP', size });
      });
      this.cupStacks.push(stack);
      this.stockProps.push({ prop: stack, stockId: stockIdOfCup(size) });
    }

    this.sealer = new SealMachine(this, L, this.ts).onTap(() => {
      const cup = this.currentCup();
      if (cup) this.adapter.dispatch({ type: 'SEAL_CUP', cupId: cup.id });
      else this.overlay.toast.show(REJECT_TEXT.noCup, 'warn');
    });
    this.trash = new TrashBin(this, L, this.ts);
    this.ice = new IceBin(this, L, this.ts).onTap(() =>
      this.withCup((cup) => this.adapter.dispatch({ type: 'SCOOP_ICE', cupId: cup.id }), () => this.ice.refuse()),
    );
    this.syrup = new SyrupPump(this, L, this.ts).onTap(() =>
      this.withCup((cup) => this.adapter.dispatch({ type: 'TAP_SYRUP', cupId: cup.id }), () => this.syrup.refuse()),
    );
    this.serveButton = new ServeButton(this, L, this.ts).onTap(() => this.serveCurrentCup());

    L.toppings.forEach((rect, i) => {
      const topping = TOPPINGS[i];
      if (!topping) return;
      const jar = new ToppingJar(this, L, rect, topping, !state.unlockedToppings.includes(topping.id), this.ts);
      jar.onTap(() => {
        if (jar.locked) {
          jar.refuse();
          this.overlay.toast.show(REJECT_TEXT.locked, 'warn');
          return;
        }
        this.withCup(
          (cup) => {
            this.lastJar = jar;
            this.adapter.dispatch({ type: 'ADD_TOPPING', cupId: cup.id, topping: topping.id });
          },
          () => jar.refuse(),
        );
      });
      this.toppingJars.push(jar);
      if (!jar.locked) this.stockProps.push({ prop: jar, stockId: stockIdOfTopping(topping.id) });
    });
    this.stockProps.push({ prop: this.ice, stockId: STOCK_ICE }, { prop: this.syrup, stockId: STOCK_SUGAR });

    this.worker = new Worker(this, L, UI_TEXT.staffName, this.ts);
    this.queue = new QueueStrip(this, L);
    this.bubble = new OrderBubble(this, L.bubble, this.ts).setDepth(DEPTH.customer);
    this.stream = this.add.graphics().setDepth(DEPTH.stream);
    const steamFrom = this.dispensers.filter((d) => !d.locked).map((d) => d.lidTop);
    this.ambience = new Ambience(this, L, steamFrom, DEPTH.props);
    this.highlight = this.add.graphics().setDepth(DEPTH.highlight);
  }

  // ───────────────────────── Thao tác ─────────────────────────

  private setupInput(): void {
    this.input.dragDistanceThreshold = 10;
    // Chạm vào nền (không trúng vật nào) thì mới cuộn — thao tác trên vật thể luôn được ưu tiên.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.scroll.begin(pointer);
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => this.scroll.move(pointer));
    const release = (pointer: Phaser.Input.Pointer) => {
      this.scroll.end(pointer);
      if (this.pour && this.pour.pointerId === pointer.id) this.finishPour();
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) =>
      this.scroll.wheel(dy),
    );
    // Rời tab khi đang giữ rót thì coi như thả tay
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.finishPour(), this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, undefined, this));
  }

  private currentCup(): CupState | null {
    return this.adapter.getState().cups[0] ?? null;
  }

  /** Chạy `fn` nếu đang có ly trên bảng, nếu không thì báo "lấy cốc trước". */
  private withCup(fn: (cup: CupState) => void, onMissing: () => void): void {
    const cup = this.currentCup();
    if (cup) fn(cup);
    else {
      onMissing();
      this.overlay.toast.show(REJECT_TEXT.noCup, 'warn');
      for (const s of this.cupStacks) s.pop();
    }
  }

  private startPour(d: TeaDispenser, pointer: Phaser.Input.Pointer): void {
    if (d.locked) {
      d.wiggle();
      this.overlay.toast.show(REJECT_TEXT.locked, 'warn');
      return;
    }
    const cup = this.currentCup();
    let reason: keyof typeof REJECT_TEXT | null = null;
    if (!cup) reason = 'noCup';
    else if (cup.ruined) reason = 'ruined';
    else if (cup.sealed) reason = 'sealed';
    else if (cup.tea !== null && cup.tea !== d.tea.id) reason = 'differentTea';
    else if (cup.tea === null && (this.adapter.getState().stock[stockIdOfTea(d.tea.id)] ?? 0) <= 0) reason = 'outOfStock';
    if (reason || !cup) {
      d.wiggle();
      this.overlay.toast.show(REJECT_TEXT[reason ?? 'noCup'], 'warn');
      return;
    }
    this.pour = { cupId: cup.id, tea: d.tea.id, amount: 0, pointerId: pointer.id, dispenser: d };
    d.setPouring(true);
    this.sfx.pourStart();
  }

  /** Thả tay: gửi lượng trà vừa rót (cách làm này giúp sau này đồng bộ mạng mượt). */
  private finishPour(): void {
    const pour = this.pour;
    if (!pour) return;
    this.pour = null;
    pour.dispenser.setPouring(false);
    this.stream.clear();
    this.sfx.pourStop();
    if (pour.amount > 0) {
      this.adapter.dispatch({ type: 'POUR_TEA', cupId: pour.cupId, tea: pour.tea, amount: pour.amount });
    }
  }

  private serveCurrentCup(): void {
    const state = this.adapter.getState();
    const cup = state.cups[0];
    const customer = state.customers[0];
    if (!cup) return this.overlay.toast.show(REJECT_TEXT.noCup, 'warn');
    if (!customer) return this.overlay.toast.show(REJECT_TEXT.noCustomer, 'warn');
    this.adapter.dispatch({ type: 'SERVE_CUP', cupId: cup.id, customerId: customer.id });
  }

  private attachCupDrag(view: Cup): void {
    this.input.setDraggable(view.hit);
    view.hit.on(Phaser.Input.Events.GAMEOBJECT_DRAG_START, (pointer: Phaser.Input.Pointer) => {
      if (this.pour) return;
      this.dragPointer = pointer;
      view.setDepth(DEPTH.dragging);
    });
    view.hit.on(Phaser.Input.Events.GAMEOBJECT_DRAG_END, () => this.dropCup(view));
  }

  private dragWorldPoint(): Phaser.Math.Vector2 | null {
    if (!this.dragPointer) return null;
    return this.cameras.main.getWorldPoint(this.dragPointer.x, this.dragPointer.y);
  }

  private overCustomer(x: number, y: number): boolean {
    return inRect(this.layout.customer, x, y, 20) || inRect(this.layout.bubble, x, y, 20);
  }

  private dropCup(view: Cup): void {
    const point = this.dragWorldPoint();
    this.dragPointer = null;
    view.setDepth(DEPTH.cup);
    this.sealer.setHighlight(false);
    this.trash.setHighlight(false);
    if (!point) return;
    const state = this.adapter.getState();
    const cupId = view.cupId;
    const L = this.layout;
    if (inRect(L.sealer, point.x, point.y, 30)) {
      const cup = state.cups.find((c) => c.id === cupId);
      if (cup && !cup.sealed && !cup.ruined && cup.tea && !this.reducedMotion) {
        // Ly trượt vào khoang máy ép, ép xong trượt về bảng gỗ
        view.setDepth(DEPTH.dragging);
        this.tweens.add({
          targets: view,
          x: this.sealer.slot.x,
          y: this.sealer.slot.y + L.cupHeight[cup.size] * 0.45,
          duration: 160,
          onUpdate: () => view.placeAt(view.x, view.y),
          onComplete: () => {
            this.adapter.dispatch({ type: 'SEAL_CUP', cupId });
            this.time.delayedCall(380, () => this.returnCup(view));
          },
        });
        return;
      }
      this.adapter.dispatch({ type: 'SEAL_CUP', cupId });
    } else if (inRect(L.trash, point.x, point.y, 30)) {
      this.adapter.dispatch({ type: 'DISCARD_CUP', cupId });
    } else if (this.overCustomer(point.x, point.y)) {
      const customer = state.customers[0];
      if (customer) this.adapter.dispatch({ type: 'SERVE_CUP', cupId, customerId: customer.id });
      else this.overlay.toast.show(REJECT_TEXT.noCustomer, 'warn');
    }
    this.returnCup(view);
  }

  /** Ly vẫn còn (chưa giao / bỏ) thì trượt về bảng gỗ. */
  private returnCup(view: Cup): void {
    if (!view.active || this.cupView !== view) return;
    view.setDepth(DEPTH.cup);
    this.tweens.add({
      targets: view,
      x: this.layout.cupSpot.x,
      y: this.layout.cupSpot.y,
      duration: 220,
      ease: 'Quad.easeOut',
      onUpdate: () => view.placeAt(view.x, view.y),
    });
  }

  // ───────────────────────── Sự kiện từ logic ─────────────────────────

  private handleEvents(state: ShopState, events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'rejected':
          this.overlay.toast.show(REJECT_TEXT[e.reason], 'warn');
          this.sfx.nope();
          if (e.action === 'TAP_SYRUP') this.syrup.refuse();
          else if (e.action === 'SCOOP_ICE') this.ice.refuse();
          else if (e.action === 'ADD_TOPPING') this.lastJar?.refuse();
          else if (e.action === 'PICK_CUP') for (const s of this.cupStacks) s.pop();
          break;
        case 'cupRuined':
          this.overlay.toast.show(EVENT_TEXT.ruined, 'warn', 2500);
          this.sfx.trash();
          if (!this.reducedMotion) this.cameras.main.shake(200, 0.004);
          break;
        case 'cupPicked':
          this.sfx.pick();
          break;
        case 'syrupTapped':
          this.syrup.pump();
          this.sfx.drip();
          this.dropSyrup();
          break;
        case 'iceScooped':
          this.ice.scoop();
          this.sfx.ice();
          break;
        case 'toppingAdded':
          this.lastJar?.scoop();
          this.sfx.plop();
          break;
        case 'cupSealed':
          this.sealer.stamp();
          this.sfx.seal();
          this.overlay.toast.show(EVENT_TEXT.sealed);
          break;
        case 'cupDiscarded':
          this.overlay.toast.show(EVENT_TEXT.discarded);
          this.sfx.trash();
          break;
        case 'served':
          this.moodOverride = { id: e.customerId, mood: e.score.total >= 50 ? 'happy' : 'sad' };
          this.showScorePopup(e.score.total, e.score.stars, e.money);
          if (e.score.total >= 80) this.worker.cheer();
          this.sfx.coin();
          if (e.score.total >= 90) this.time.delayedCall(250, () => this.sfx.joy());
          else if (e.score.total < 50) this.time.delayedCall(250, () => this.sfx.sad());
          break;
        case 'customerLeft':
          if (e.reason === 'impatient') {
            this.moodOverride = { id: e.customerId, mood: 'sad' };
            this.overlay.toast.show(fill(EVENT_TEXT.customerLeft, { name: e.name }), 'warn', 2800);
            this.sfx.sad();
          }
          if (e.customerId === this.registry.get('tutorialTarget')) this.finishTutorial();
          break;
        case 'unlocked':
          // Món mới mở khóa: dựng lại cảnh để bình / hũ hết khóa, giữ chỗ đang xem
          this.registry.set('scrollY', this.scroll.scrollY);
          this.scene.restart();
          return;
        case 'customerArrived':
          this.sfx.bell();
          break;
        case 'dayStarted':
          this.scroll.scrollTo(0);
          this.sfx.fanfare();
          break;
        default:
          break;
      }
    }
    // Ly bị giao / bỏ trong lúc đang kéo thì thôi kéo
    if (this.dragPointer && !state.cups.some((c) => c.id === this.cupView?.cupId)) this.dragPointer = null;
  }

  /** Giọt nước đường rơi từ vòi bơm xuống ly. */
  private dropSyrup(): void {
    if (this.reducedMotion || !this.cupView) return;
    const cup = this.currentCup();
    if (!cup) return;
    const L = this.layout;
    const surface = this.cupView.y - Math.max(0.1, cup.fill) * L.cupHeight[cup.size];
    const drop = this.add.graphics().setDepth(DEPTH.stream);
    drop.fillStyle(0xe7a74a, 1);
    drop.fillCircle(0, 0, 9);
    drop.fillTriangle(-8, -2, 8, -2, 0, -18);
    drop.lineStyle(2, hex(PALETTE.outline), 0.8);
    drop.strokeCircle(0, 0, 9);
    drop.setPosition(this.cupView.x + 14, L.board.y - 10);
    this.tweens.add({
      targets: drop,
      y: surface,
      duration: 320,
      ease: 'Quad.easeIn',
      onComplete: () => drop.destroy(),
    });
  }

  /** Bảng điểm bật ra trên đầu khách: điểm, sao bật lần lượt, tiền; đồng xu bay lên HUD. */
  private showScorePopup(score: number, stars: number, money: number): void {
    const L = this.layout;
    const c = L.customer;
    const x = c.x + c.w / 2 + 60 * this.ts;
    const y = c.y + c.h * 0.22;
    const popup = this.add.container(x, y).setDepth(DEPTH.fx);
    const g = this.add.graphics();
    const w = 360 * this.ts;
    const h = 200 * this.ts;
    g.fillStyle(hex(PALETTE.woodDark), 0.35);
    g.fillRoundedRect(-w / 2 + 4, -h / 2 + 8, w, h, 26);
    box(g, -w / 2, -h / 2, w, h, { fill: PALETTE.white, radius: 26 });
    popup.add(g);
    popup.add(text(this, 0, -h * 0.3, fill(UI_TEXT.scoreLine, { score }), { size: 46 * this.ts, title: true }));
    const starSize = starArt(L, true).w;
    for (let i = 0; i < 5; i++) {
      const star = this.add.image((i - 2) * starSize * 0.95, h * 0.02, starArt(L, i < stars).key);
      popup.add(star);
      if (!this.reducedMotion && i < stars) {
        star.setScale(0);
        this.tweens.add({ targets: star, scale: 1, duration: 260, delay: 200 + i * 110, ease: 'Back.easeOut' });
      }
    }
    popup.add(text(this, 0, h * 0.33, `+${formatMoney(money)}`, { size: 44 * this.ts, color: '#C98A12', title: true }));
    if (!this.reducedMotion) {
      popup.setScale(0.4);
      this.tweens.add({ targets: popup, scale: 1, duration: 300, ease: 'Back.easeOut' });
    }
    this.tweens.add({
      targets: popup,
      y: y - 120,
      alpha: 0,
      delay: 1700,
      duration: 600,
      onComplete: () => popup.destroy(),
    });
    this.flyCoins(x, y + h * 0.33);
  }

  /** Vài đồng xu bay từ khách lên ô tiền trên HUD. */
  private flyCoins(fromX: number, fromY: number): void {
    if (this.reducedMotion) {
      this.overlay.hud.flashMoney();
      return;
    }
    const L = this.layout;
    const key = coinArt(L).key;
    for (let i = 0; i < 4; i++) {
      const coin = this.add.image(fromX + (i - 1.5) * 24, fromY, key).setDepth(DEPTH.fx);
      this.tweens.add({
        targets: coin,
        // Ô tiền ở giữa HUD; toạ độ thế giới phụ thuộc vị trí cuộn lúc bay
        x: L.viewWidth / 2,
        y: { getEnd: () => this.scroll.scrollY + L.hudHeight * 0.62 },
        scale: 0.6,
        duration: 650,
        delay: 350 + i * 90,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          coin.destroy();
          if (i === 0) this.overlay.hud.flashMoney();
        },
      });
    }
  }

  // ───────────────────────── Vẽ theo state mỗi khung hình ─────────────────────────

  update(time: number, delta: number): void {
    if (!this.ready) return;
    this.adapter.update(delta);
    const state = this.adapter.getState();
    this.scroll.update(delta);
    this.updatePour(state, delta);
    this.updateDrag(delta);
    this.syncView(state, true, time);
    this.ambience.update(time, this.reducedMotion);
    this.updateTutorial(state, time);
    this.updateNav();
    this.updateStock(state);
  }

  private updateStock(state: ShopState): void {
    for (const { prop, stockId } of this.stockProps) prop.setStock(state.stock[stockId] ?? 0, LOW_STOCK_AT);
    for (const jar of this.toppingJars) jar.setLevel(state.stock[stockIdOfTopping(jar.topping.id)] ?? 0);
    // Vừa hết giờ: báo ngừng nhận khách
    if (this.lastPhase === 'open' && state.phase === 'closing') {
      this.overlay.toast.show(SUMMARY_TEXT.closing, 'info', 3500);
    }
    this.lastPhase = state.phase;
  }

  private updatePour(state: ShopState, delta: number): void {
    const pour = this.pour;
    if (!pour) return;
    const cup = state.cups.find((c) => c.id === pour.cupId);
    if (!cup) {
      this.pour = null;
      pour.dispenser.setPouring(false);
      this.stream.clear();
      this.sfx.pourStop();
      return;
    }
    pour.amount += (SIZES[cup.size].pourPerSecond * delta) / 1000;
    // Tiếng rót cao dần theo mực nước
    this.sfx.pourLevel(cup.fill + pour.amount);
    // Tràn: gửi ngay để logic đánh dấu ly hỏng
    if (cup.fill + pour.amount > OVERFLOW_AT) this.finishPour();
  }

  private updateDrag(delta: number): void {
    const point = this.dragWorldPoint();
    if (!point || !this.cupView || !this.dragPointer) return;
    // Sát mép trên / dưới thì cuộn theo để kéo ly lên tới khách
    const py = this.dragPointer.y;
    const L = this.layout;
    if (py < L.hudHeight + EDGE_SCROLL_ZONE) this.scroll.nudge(-EDGE_SCROLL_SPEED * delta);
    else if (py > L.viewHeight - L.navHeight - EDGE_SCROLL_ZONE) this.scroll.nudge(EDGE_SCROLL_SPEED * delta);
    const cupH = L.cupHeight[this.currentCup()?.size ?? 'M'];
    this.cupView.placeAt(point.x, point.y + cupH / 2);
    this.sealer.setHighlight(inRect(L.sealer, point.x, point.y, 30));
    this.trash.setHighlight(inRect(L.trash, point.x, point.y, 30));
  }

  private syncView(state: ShopState, animate: boolean, time = 0): void {
    this.syncCustomer(state, animate, time);
    this.syncCup(state, time, animate);
    const front = state.customers[0] ?? null;
    const cup = state.cups[0] ?? null;
    this.serveButton.setEnabled(!!cup && cup.sealed && !cup.ruined && !!front);
    this.worker.idle(time, this.reducedMotion);
  }

  private syncCustomer(state: ShopState, animate: boolean, time: number): void {
    const front: CustomerData | null = state.customers[0] ?? null;
    const rm = this.reducedMotion;
    if (this.customerView && this.customerView.customerId !== front?.id) {
      const leaving = this.customerView;
      const happy = this.moodOverride?.id === leaving.customerId && this.moodOverride.mood === 'happy';
      if (this.moodOverride?.id === leaving.customerId) leaving.setMood(this.moodOverride.mood);
      if (animate) leaving.leave(happy, rm);
      else leaving.destroy();
      this.customerView = null;
    }
    if (front && !this.customerView) {
      this.customerView = new Customer(this, this.layout, front, this.ts);
      this.customerView.setDepth(DEPTH.customer);
      if (animate) this.customerView.enter(rm);
    }
    if (front && this.customerView) {
      const override = this.moodOverride?.id === front.id ? this.moodOverride.mood : null;
      this.customerView.setMood(override ?? (front.patience > 0.35 ? 'normal' : 'sad'));
      this.customerView.idle(time, rm);
    }
    this.bubble.setCustomer(front);
    if (front) this.bubble.setPatience(front.patience);
    // Hàng chờ: vẽ lại khi kiên nhẫn đổi đủ nhiều
    const waiting = state.customers.slice(1);
    const queueKey = waiting.map((c) => `${c.id}:${Math.round(c.patience * 50)}`).join('|');
    if (queueKey !== this.lastQueueKey) {
      this.lastQueueKey = queueKey;
      this.queue.render(waiting);
    }
  }

  private syncCup(state: ShopState, time: number, animate: boolean): void {
    const L = this.layout;
    const cup = state.cups[0] ?? null;
    if (this.cupView && this.cupView.cupId !== cup?.id) {
      this.cupView.destroy();
      this.cupView = null;
      this.dragPointer = null;
    }
    if (cup && !this.cupView) {
      this.cupView = new Cup(this, L, L.cupSpot.x, L.cupSpot.y, cup, this.ts);
      this.cupView.setDepth(DEPTH.cup);
      this.attachCupDrag(this.cupView);
      if (animate && !this.reducedMotion) {
        // Ly rơi nhẹ xuống bảng gỗ
        this.cupView.placeAt(L.cupSpot.x, L.cupSpot.y - 60);
        const view = this.cupView;
        this.tweens.add({
          targets: view,
          y: L.cupSpot.y,
          duration: 250,
          ease: 'Bounce.easeOut',
          onUpdate: () => view.placeAt(view.x, view.y),
        });
      }
    }
    this.boardHint.setVisible(!cup);

    // Mực trà hiển thị = state + phần đang rót dở trên máy này
    const pouring = this.pour && cup && this.pour.cupId === cup.id ? this.pour.amount : 0;
    if (cup && this.cupView) {
      const displayFill = cup.fill + pouring;
      const size = SIZES[cup.size];
      const inGreen = displayFill >= size.greenMin && displayFill <= size.greenMax;
      // Vạch xanh nhấp nháy khi đang rót và mực trà nằm trong vùng xanh
      const blink = pouring > 0 && inGreen && Math.floor(time / 120) % 2 === 0;
      const pouringTea = pouring > 0 && this.pour ? this.pour.tea : null;
      this.cupView.render(cup, displayFill, blink, pouringTea, time, animate && !this.reducedMotion);
      this.drawStream(cup, displayFill, time);
    }

    const status = cup
      ? cup.sealed && !cup.ruined
        ? describeCupStatus(cup) + STATUS_TEXT.separator + STATUS_TEXT.sealed
        : describeCupStatus(cup)
      : '';
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.statusText.setText(status);
      this.statusBg.clear();
      if (status) {
        const w = this.statusText.width + 50;
        const h = this.statusText.height + 16;
        this.statusBg.fillStyle(hex(PALETTE.woodDark), 0.35);
        this.statusBg.fillRoundedRect(L.statusText.x - w / 2, L.statusText.y - h / 2 + 4, w, h, h / 2);
        box(this.statusBg, L.statusText.x - w / 2, L.statusText.y - h / 2, w, h, {
          fill: cup?.ruined ? PALETTE.pinkLight : PALETTE.white,
          radius: h / 2,
        });
      }
    }
  }

  /** Dòng trà chảy từ trên xuống mặt nước trong ly (có giọt bắn nhỏ). */
  private drawStream(cup: CupState, displayFill: number, time: number): void {
    const g = this.stream;
    g.clear();
    if (!this.pour || !this.cupView || this.dragPointer) return;
    const tea = TEAS.find((t) => t.id === this.pour?.tea);
    if (!tea) return;
    const L = this.layout;
    const h = L.cupHeight[cup.size];
    const top = L.board.y - 30;
    const surface = this.cupView.y - Math.min(displayFill, 1) * h;
    const x = this.cupView.x;
    const wobble = this.reducedMotion ? 0 : Math.sin(time / 60) * 2;
    const color = hex(tea.color);
    // Vòi rót nhỏ phía trên
    box(g, x - 34, top - 26, 68, 26, { fill: '#D9D6D2', radius: 10 });
    g.fillStyle(color, 0.95);
    g.fillRoundedRect(x - 10 + wobble, top, 20, surface - top, 10);
    g.lineStyle(2, hex(PALETTE.outline), 0.5);
    g.strokeRoundedRect(x - 10 + wobble, top, 20, surface - top, 10);
    // Giọt bắn ở mặt nước
    if (!this.reducedMotion) {
      for (let i = 0; i < 3; i++) {
        const phase = (time / 260 + i / 3) % 1;
        const dx = (i - 1) * 22 * phase;
        g.fillStyle(color, 1 - phase);
        g.fillCircle(x + dx, surface - 18 * Math.sin(phase * Math.PI), 5);
      }
    }
  }

  // ───────────────────────── Hướng dẫn lần đầu ─────────────────────────

  private finishTutorial(): void {
    this.registry.set('tutorialTarget', null);
    this.registry.set('tutorialDone', true);
    this.overlay.tutorial.hide();
    this.highlight?.clear();
  }

  private targetRect(target: TutorialTarget): Rect | null {
    const L = this.layout;
    switch (target.kind) {
      case 'cupStack':
        return L.cupStacks[target.size];
      case 'dispenser':
        return this.dispensers.find((d) => d.tea.id === target.tea)?.rect ?? null;
      case 'syrup':
        return L.syrup;
      case 'ice':
        return L.ice;
      case 'topping':
        return this.toppingJars.find((j) => j.topping.id === target.topping)?.rect ?? null;
      case 'sealer':
        return L.sealer;
      case 'trash':
        return L.trash;
      case 'serve':
        return L.serveButton;
    }
  }

  private updateTutorial(state: ShopState, time: number): void {
    if (this.registry.get('tutorialDone')) return;
    // Hướng dẫn gắn với một khách: khách đang ở quầy lúc hướng dẫn bắt đầu
    let target = this.registry.get('tutorialTarget') as string | null;
    if (!target && state.customers[0]) {
      target = state.customers[0].id;
      this.registry.set('tutorialTarget', target);
    }
    const step = target ? currentTutorialStep(state, target) : null;
    const rect = step ? this.targetRect(step.target) : null;
    if (!step || !rect || this.dragPointer) {
      this.overlay.tutorial.hide();
      this.highlight.clear();
      return;
    }
    const cam = this.cameras.main;
    const L = this.layout;
    // Bước mới mà vật nằm ngoài màn hình thì cuộn tới
    const key = step.text;
    if (key !== this.lastTutorialKey) {
      this.lastTutorialKey = key;
      const visibleTop = cam.scrollY + L.hudHeight + 140;
      const visibleBottom = cam.scrollY + L.viewHeight - L.navHeight;
      if (rect.y < visibleTop || rect.y + rect.h > visibleBottom) {
        this.scroll.scrollTo(rect.y + rect.h / 2 - (L.viewHeight + L.hudHeight - L.navHeight) / 2);
      }
    }
    // Viền hồng nhấp nháy quanh vật cần thao tác
    this.highlight.clear();
    this.highlight.lineStyle(8, hex(PALETTE.pink), 0.55 + 0.45 * Math.sin(time / 160));
    this.highlight.strokeRoundedRect(rect.x - 8, rect.y - 8, rect.w + 16, rect.h + 16, 20);
    // Thẻ xanh đặt phía trên vật (toạ độ CSS trong overlay)
    const k = this.overlay.pxPerUnit;
    this.overlay.tutorial.show(
      step.text,
      (rect.x + rect.w / 2 - cam.scrollX) * k,
      (rect.y - 8 - cam.scrollY) * k,
      (rect.y + rect.h + 8 - cam.scrollY) * k,
      { width: L.viewWidth * k, top: L.hudHeight * k },
    );
  }

  /** Làm nổi nút nhảy nhanh của vùng đang xem. */
  private updateNav(): void {
    if (!this.scroll.enabled) return;
    const y = this.scroll.scrollY;
    const s = this.layout.sections;
    const section: Section = y >= s.topping - 40 ? 'topping' : y >= s.brew - 200 ? 'brew' : 'tea';
    if (section !== this.activeSection) {
      this.activeSection = section;
      this.overlay.nav.setActive(section);
    }
  }
}
