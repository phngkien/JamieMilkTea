// Cảnh tiệm duy nhất. Scene chỉ ĐỌC state để vẽ và GỬI action khi người chơi thao tác;
// mọi luật chơi nằm trong src/core.
import Phaser from 'phaser';
import { OVERFLOW_AT, SIZES } from '../config/cup';
import { PALETTE, hex } from '../config/palette';
import {
  LOW_STOCK_AT,
  STOCK_ICE,
  STOCK_SUGAR,
  stockIdOfCup,
  stockIdOfTea,
  stockIdOfTopping,
} from '../config/inventory';
import { EVENT_TEXT, REJECT_TEXT, STATUS_TEXT, SUMMARY_TEXT, UI_TEXT, fill } from '../config/strings';
import { TEAS } from '../config/teas';
import { TOPPINGS } from '../config/toppings';
import { describeCupStatus } from '../core/brewing';
import { formatMoney } from '../core/economy';
import type { Customer as CustomerData, CupState, GameEvent, ShopState } from '../core/types';
import { Cup } from '../entities/Cup';
import { Customer } from '../entities/Customer';
import { CupStack } from '../entities/CupStack';
import { box, text } from '../entities/draw';
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
import { inRect, type Rect, type ShopLayout } from '../layout';
import type { NetAdapter } from '../net/NetAdapter';
import type { Overlay } from '../ui/overlay';
import type { Section } from '../ui/quickNav';
import { currentTutorialStep, type TutorialTarget } from '../ui/tutorial';
import { ScrollController } from './ScrollController';

/** Kéo ly sát mép trên/dưới màn hình (đơn vị khung) thì cảnh tự cuộn theo. */
const EDGE_SCROLL_ZONE = 160;
const EDGE_SCROLL_SPEED = 1.1; // đơn vị khung mỗi ms

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

  create(): void {
    this.adapter = this.registry.get('adapter') as NetAdapter;
    this.overlay = this.registry.get('overlay') as Overlay;
    this.layout = this.registry.get('layout') as ShopLayout;
    this.ts = this.layout.kind === 'portrait' ? 1 : 0.75;
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

    this.drawBackground();
    this.createProps();
    this.setupInput();

    this.unsubscribe = this.adapter.subscribe((state, events) => this.handleEvents(state, events));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = null;
    });
    // Vẽ ngay khách đang có (không chạy hiệu ứng đi vào khi đổi bố cục)
    this.syncView(this.adapter.getState(), false);
  }

  /** Scene được khởi động lại khi xoay máy: xóa tham chiếu cũ. */
  private resetFields(): void {
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
    const g = this.add.graphics();
    // Tường kem toàn cảnh
    g.fillStyle(hex(PALETTE.cream), 1);
    g.fillRect(0, 0, L.viewWidth, L.worldHeight);
    // Ốp gỗ chân tường phía sau khách
    g.fillStyle(hex(PALETTE.beige), 1);
    g.fillRect(0, L.customer.y + L.customer.h * 0.55, L.kind === 'portrait' ? L.viewWidth : 720, L.customer.h * 0.45);
    // Mái hiên sọc hồng – trắng có mép lượn sóng
    const a = L.awning;
    const stripe = L.kind === 'portrait' ? 90 : 80;
    for (let x = 0, i = 0; x < a.w; x += stripe, i++) {
      const color = hex(i % 2 === 0 ? PALETTE.pink : PALETTE.white);
      g.fillStyle(color, 1);
      g.fillRect(x, a.y, stripe, a.h * 0.75);
      g.fillCircle(x + stripe / 2, a.y + a.h * 0.75, stripe / 2);
    }
    g.lineStyle(3, hex(PALETTE.outline), 1);
    g.lineBetween(0, a.y, a.w, a.y);
    // Mặt quầy dưới hàng bình trà
    box(g, L.teaShelf.x, L.teaShelf.y, L.teaShelf.w, L.teaShelf.h, { fill: PALETTE.woodLight, radius: 12 });
    // Bảng gỗ pha ly
    const b = L.board;
    box(g, b.x, b.y, b.w, b.h, { fill: PALETTE.woodLight, radius: 24 });
    g.lineStyle(3, hex(PALETTE.woodDark), 0.35);
    for (let i = 1; i < 5; i++) g.lineBetween(b.x + 20, b.y + (b.h * i) / 5, b.x + b.w - 20, b.y + (b.h * i) / 5 + 6);
    // Khay kim loại của kệ topping
    const t = L.toppingShelf;
    box(g, t.x, t.y, t.w, t.h, { fill: '#A9A39D', radius: 20 });
    // Kệ foam / siro (sắp mở)
    const c = L.comingSoon;
    box(g, c.x, c.y, c.w, c.h, { fill: PALETTE.beige, radius: 18, alpha: 0.8 });
    text(this, c.x + c.w / 2, c.y + c.h / 2, UI_TEXT.comingSoon, { size: 34 * this.ts, color: '#8A7F78' });
    // Quầy gỗ cuối cảnh
    g.fillStyle(hex(PALETTE.woodDark), 1);
    g.fillRect(L.floor.x, L.floor.y, L.floor.w, L.floor.h);
    g.fillStyle(hex(PALETTE.woodLight), 1);
    g.fillRect(L.floor.x, L.floor.y, L.floor.w, 18);

    // Nhãn các vùng
    for (const label of L.labels) {
      const t2 = text(this, 0, 0, UI_TEXT[label.key], { size: 38 * this.ts, title: true });
      const w = t2.width + 50;
      const h = 64 * this.ts;
      const lg = this.add.graphics();
      box(lg, label.x, label.y, w, h, { fill: PALETTE.beige, radius: 14 });
      t2.setPosition(label.x + w / 2, label.y + h / 2);
      t2.setDepth(1);
    }

    // Dòng trạng thái dưới ly
    this.statusBg = this.add.graphics();
    this.statusText = text(this, L.statusText.x, L.statusText.y, '', { size: 34 * this.ts, title: true });
    this.statusText.setDepth(2);
    this.boardHint = text(this, b.x + b.w / 2, b.y + b.h / 2, UI_TEXT.board, {
      size: 36 * this.ts,
      color: PALETTE.woodDark,
      title: true,
    });
  }

  private createProps(): void {
    const L = this.layout;
    const state = this.adapter.getState();

    L.dispensers.forEach((rect, i) => {
      const tea = TEAS[i];
      if (!tea) return;
      const d = new TeaDispenser(this, rect, tea, !state.unlockedTeas.includes(tea.id), this.ts);
      d.hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.startPour(d, pointer));
      this.dispensers.push(d);
      if (!d.locked) this.stockProps.push({ prop: d, stockId: stockIdOfTea(tea.id) });
    });

    for (const size of ['M', 'L'] as const) {
      const stack = new CupStack(this, L.cupStacks[size], size, this.ts);
      stack.onTap(() => {
        stack.pop();
        this.adapter.dispatch({ type: 'PICK_CUP', size });
      });
      this.cupStacks.push(stack);
      this.stockProps.push({ prop: stack, stockId: stockIdOfCup(size) });
    }

    this.sealer = new SealMachine(this, L.sealer, this.ts).onTap(() => {
      const cup = this.currentCup();
      if (cup) this.adapter.dispatch({ type: 'SEAL_CUP', cupId: cup.id });
      else this.overlay.toast.show(REJECT_TEXT.noCup, 'warn');
    });
    this.trash = new TrashBin(this, L.trash, this.ts);
    this.ice = new IceBin(this, L.ice, this.ts).onTap(() => this.withCup((cup) => {
      this.adapter.dispatch({ type: 'SCOOP_ICE', cupId: cup.id });
    }, () => this.ice.refuse()));
    this.syrup = new SyrupPump(this, L.syrup, this.ts).onTap(() => this.withCup((cup) => {
      this.adapter.dispatch({ type: 'TAP_SYRUP', cupId: cup.id });
    }, () => this.syrup.refuse()));
    this.serveButton = new ServeButton(this, L.serveButton, this.ts).onTap(() => this.serveCurrentCup());

    L.toppings.forEach((rect, i) => {
      const topping = TOPPINGS[i];
      if (!topping) return;
      const jar = new ToppingJar(this, rect, topping, !state.unlockedToppings.includes(topping.id), this.ts);
      jar.onTap(() => {
        if (jar.locked) {
          jar.refuse();
          this.overlay.toast.show(REJECT_TEXT.locked, 'warn');
          return;
        }
        this.withCup((cup) => {
          this.lastJar = jar;
          this.adapter.dispatch({ type: 'ADD_TOPPING', cupId: cup.id, topping: topping.id });
        }, () => jar.refuse());
      });
      this.toppingJars.push(jar);
      if (!jar.locked) this.stockProps.push({ prop: jar, stockId: stockIdOfTopping(topping.id) });
    });
    this.stockProps.push({ prop: this.ice, stockId: STOCK_ICE }, { prop: this.syrup, stockId: STOCK_SUGAR });

    this.queue = new QueueStrip(this, L.queue);
    this.bubble = new OrderBubble(this, L.bubble, this.ts);
    this.stream = this.add.graphics().setDepth(5);
    this.highlight = this.add.graphics().setDepth(20);
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
  }

  /** Thả tay: gửi lượng trà vừa rót (cách làm này giúp sau này đồng bộ mạng mượt). */
  private finishPour(): void {
    const pour = this.pour;
    if (!pour) return;
    this.pour = null;
    pour.dispenser.setPouring(false);
    this.stream.clear();
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
      view.setDepth(10);
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
    view.setDepth(0);
    this.sealer.setHighlight(false);
    this.trash.setHighlight(false);
    if (!point) return;
    const state = this.adapter.getState();
    const cupId = view.cupId;
    if (inRect(this.layout.sealer, point.x, point.y, 30)) {
      this.adapter.dispatch({ type: 'SEAL_CUP', cupId });
    } else if (inRect(this.layout.trash, point.x, point.y, 30)) {
      this.adapter.dispatch({ type: 'DISCARD_CUP', cupId });
    } else if (this.overCustomer(point.x, point.y)) {
      const customer = state.customers[0];
      if (customer) this.adapter.dispatch({ type: 'SERVE_CUP', cupId, customerId: customer.id });
      else this.overlay.toast.show(REJECT_TEXT.noCustomer, 'warn');
    }
    // Ly vẫn còn (chưa giao / bỏ) thì trượt về bảng gỗ
    if (view.active && this.cupView === view) {
      this.tweens.add({
        targets: view,
        x: this.layout.cupSpot.x,
        y: this.layout.cupSpot.y,
        duration: 220,
        ease: 'Quad.easeOut',
        onUpdate: () => view.placeAt(view.x, view.y),
      });
    }
  }

  // ───────────────────────── Sự kiện từ logic ─────────────────────────

  private handleEvents(state: ShopState, events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'rejected':
          this.overlay.toast.show(REJECT_TEXT[e.reason], 'warn');
          if (e.action === 'TAP_SYRUP') this.syrup.refuse();
          else if (e.action === 'SCOOP_ICE') this.ice.refuse();
          else if (e.action === 'ADD_TOPPING') this.lastJar?.refuse();
          else if (e.action === 'PICK_CUP') for (const s of this.cupStacks) s.pop();
          break;
        case 'cupRuined':
          this.overlay.toast.show(EVENT_TEXT.ruined, 'warn', 2500);
          this.cameras.main.shake(200, 0.004);
          break;
        case 'syrupTapped':
          this.syrup.pump();
          break;
        case 'iceScooped':
          this.ice.scoop();
          break;
        case 'toppingAdded':
          this.lastJar?.scoop();
          break;
        case 'cupSealed':
          this.sealer.stamp();
          this.overlay.toast.show(EVENT_TEXT.sealed);
          break;
        case 'cupDiscarded':
          this.overlay.toast.show(EVENT_TEXT.discarded);
          break;
        case 'served':
          this.moodOverride = { id: e.customerId, mood: e.score.total >= 50 ? 'happy' : 'sad' };
          this.showScorePopup(e.score.total, e.score.stars, e.money);
          this.overlay.hud.flashMoney();
          break;
        case 'customerLeft':
          if (e.reason === 'impatient') {
            this.moodOverride = { id: e.customerId, mood: 'sad' };
            this.overlay.toast.show(fill(EVENT_TEXT.customerLeft, { name: e.name }), 'warn', 2800);
          }
          if (e.customerId === this.registry.get('tutorialTarget')) this.finishTutorial();
          break;
        case 'unlocked':
          // Món mới mở khóa: dựng lại cảnh để bình / hũ hết khóa, giữ chỗ đang xem
          this.registry.set('scrollY', this.scroll.scrollY);
          this.scene.restart();
          return;
        case 'dayStarted':
          this.scroll.scrollTo(0);
          break;
        default:
          break;
      }
    }
    // Ly bị giao / bỏ trong lúc đang kéo thì thôi kéo
    if (this.dragPointer && !state.cups.some((c) => c.id === this.cupView?.cupId)) this.dragPointer = null;
  }

  private showScorePopup(score: number, stars: number, money: number): void {
    const c = this.layout.customer;
    const x = c.x + c.w / 2 + 40;
    const y = c.y + c.h * 0.2;
    const popup = this.add.container(x, y).setDepth(30);
    const g = this.add.graphics();
    const w = 330 * this.ts;
    const h = 190 * this.ts;
    box(g, -w / 2, -h / 2, w, h, { fill: PALETTE.white, radius: 24 });
    popup.add(g);
    popup.add(text(this, 0, -h * 0.28, fill(UI_TEXT.scoreLine, { score }), { size: 44 * this.ts, title: true }));
    popup.add(
      text(this, 0, 0, '★'.repeat(stars) + '☆'.repeat(5 - stars), { size: 44 * this.ts, color: '#E0A82E', title: true }),
    );
    popup.add(text(this, 0, h * 0.3, `+${formatMoney(money)}`, { size: 44 * this.ts, color: '#C98A12', title: true }));
    popup.setScale(0.4);
    this.tweens.add({ targets: popup, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: popup,
      y: y - 120,
      alpha: 0,
      delay: 1500,
      duration: 600,
      onComplete: () => popup.destroy(),
    });
  }

  // ───────────────────────── Vẽ theo state mỗi khung hình ─────────────────────────

  update(time: number, delta: number): void {
    this.adapter.update(delta);
    const state = this.adapter.getState();
    this.scroll.update(delta);
    this.updatePour(state, delta);
    this.updateDrag(delta);
    this.syncView(state, true, time);
    this.updateTutorial(state, time);
    this.updateNav();
    this.updateStock(state);
  }

  private updateStock(state: ShopState): void {
    for (const { prop, stockId } of this.stockProps) prop.setStock(state.stock[stockId] ?? 0, LOW_STOCK_AT);
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
      return;
    }
    pour.amount += (SIZES[cup.size].pourPerSecond * delta) / 1000;
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
    this.syncCup(state);
    const front = state.customers[0] ?? null;
    const cup = state.cups[0] ?? null;
    this.serveButton.setEnabled(!!cup && cup.sealed && !cup.ruined && !!front);
  }

  private syncCustomer(state: ShopState, animate: boolean, time: number): void {
    const front: CustomerData | null = state.customers[0] ?? null;
    if (this.customerView && this.customerView.customerId !== front?.id) {
      const leaving = this.customerView;
      if (this.moodOverride?.id === leaving.customerId) leaving.setMood(this.moodOverride.mood);
      if (animate) leaving.leave();
      else leaving.destroy();
      this.customerView = null;
    }
    if (front && !this.customerView) {
      this.customerView = new Customer(this, this.layout.customer, front, this.ts);
      if (animate) this.customerView.enter();
    }
    if (front && this.customerView) {
      const override = this.moodOverride?.id === front.id ? this.moodOverride.mood : null;
      this.customerView.setMood(override ?? (front.patience > 0.6 ? 'happy' : front.patience > 0.3 ? 'normal' : 'sad'));
      this.customerView.idle(time);
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

  private syncCup(state: ShopState): void {
    const L = this.layout;
    const cup = state.cups[0] ?? null;
    if (this.cupView && this.cupView.cupId !== cup?.id) {
      this.cupView.destroy();
      this.cupView = null;
      this.dragPointer = null;
    }
    if (cup && !this.cupView) {
      this.cupView = new Cup(this, L.cupSpot.x, L.cupSpot.y, cup, L.cupHeight[cup.size], this.ts);
      this.attachCupDrag(this.cupView);
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
    this.boardHint.setVisible(!cup);

    // Mực trà hiển thị = state + phần đang rót dở trên máy này
    const pouring = this.pour && cup && this.pour.cupId === cup.id ? this.pour.amount : 0;
    if (cup && this.cupView) {
      const displayFill = cup.fill + pouring;
      const size = SIZES[cup.size];
      const inGreen = displayFill >= size.greenMin && displayFill <= size.greenMax;
      // Vạch xanh nhấp nháy khi đang rót và mực trà nằm trong vùng xanh
      const blink = pouring > 0 && inGreen && Math.floor(this.time.now / 120) % 2 === 0;
      this.cupView.render(cup, displayFill, blink);
      this.drawStream(cup, displayFill);
    }

    const status = cup ? (cup.sealed && !cup.ruined ? describeCupStatus(cup) + STATUS_TEXT.separator + STATUS_TEXT.sealed : describeCupStatus(cup)) : '';
    if (status !== this.lastStatus) {
      this.lastStatus = status;
      this.statusText.setText(status);
      this.statusBg.clear();
      if (status) {
        const w = this.statusText.width + 50;
        const h = this.statusText.height + 16;
        box(this.statusBg, L.statusText.x - w / 2, L.statusText.y - h / 2, w, h, {
          fill: cup?.ruined ? PALETTE.pinkLight : PALETTE.white,
          radius: h / 2,
        });
      }
    }
  }

  /** Dòng trà chảy từ trên xuống mặt nước trong ly. */
  private drawStream(cup: CupState, displayFill: number): void {
    this.stream.clear();
    if (!this.pour || !this.cupView || this.dragPointer) return;
    const tea = TEAS.find((t) => t.id === this.pour?.tea);
    if (!tea) return;
    const L = this.layout;
    const h = L.cupHeight[cup.size];
    const top = L.board.y - 10;
    const surface = this.cupView.y - Math.min(displayFill, 1) * h;
    const wobble = Math.sin(this.time.now / 60) * 2;
    this.stream.fillStyle(hex(tea.color), 0.95);
    this.stream.fillRoundedRect(this.cupView.x - 9 + wobble, top, 18, surface - top, 9);
    this.stream.lineStyle(2, hex(PALETTE.outline), 0.4);
    this.stream.strokeRoundedRect(this.cupView.x - 9 + wobble, top, 18, surface - top, 9);
  }

  // ───────────────────────── Hướng dẫn lần đầu ─────────────────────────

  private finishTutorial(): void {
    this.registry.set('tutorialTarget', null);
    this.registry.set('tutorialDone', true);
    this.overlay.tutorial.hide();
    this.highlight.clear();
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
