// Chơi nhiều người qua Firebase Realtime Database. Cài đặt cùng interface NetAdapter với LocalAdapter,
// nên scene và reducer không cần biết đang chơi một mình hay nhiều người.
//
// Cách hoạt động (host-authoritative, CLAUDE.md mục 5.3):
// - Host chạy reducer như chơi đơn: cho thời gian trôi, khách đến, xử lý thao tác của mọi người,
//   rồi ghi state lên /rooms/{mã}/state (định kỳ 4 lần/giây + ngay sau mỗi thao tác).
// - Máy khác: thao tác của mình áp dụng ngay trên máy (phản hồi tức thì) và gửi lên /actions;
//   khi nhận state mới của host thì lấy state đó làm chuẩn, áp lại các thao tác host chưa kịp xử lý.
// - Đang giữ bình rót: ghi lượng trà vào /live/{uid} ~10 lần/giây để người khác thấy trà dâng.
// - Host mất kết nối quá 5 giây: người vào phòng sớm nhất còn online tự nhận làm host (transaction).
import {
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type DatabaseReference,
  type Unsubscribe,
} from 'firebase/database';
import { DEFAULT_OUTFIT, outfitColor } from '../config/outfits';
import { ROOM } from '../config/room';
import { planHostActions } from '../core/day';
import { reduce } from '../core/reducer';
import { canPerform, canSpend, stationOwners, type SpendRule, type StationOwners } from '../core/stations';
import type { Action, GameEvent, ShopState, Station } from '../core/types';
import { MAX_TICK_MS } from './LocalAdapter';
import type { EmoteKind, LivePour, NetAdapter, PlayerInfo, RoomInfo, StateListener } from './NetAdapter';
import { claimSeat, releaseSeat, type RoomSession } from './room';
import { clean, decodeState, encodeState } from './serialize';

/** Sự kiện host gửi kèm state: ai gây ra (uid) và thao tác thứ mấy của người đó (seq). */
interface TaggedEvent {
  e: GameEvent;
  uid?: string;
  seq?: number;
}

interface StatePayload {
  data: unknown;
  seq: number;
  events?: TaggedEvent[];
  acks?: Record<string, number>;
}

interface PendingAction {
  seq: number;
  action: Action;
}

export class FirebaseAdapter implements NetAdapter {
  readonly mode = 'room';
  readonly localId: string;
  readonly code: string;
  private session: RoomSession;
  private state: ShopState;
  private history: ShopState['history'];
  private listeners = new Set<StateListener>();
  private roomListeners = new Set<(info: RoomInfo) => void>();
  private emoteListeners = new Set<(uid: string, kind: EmoteKind) => void>();
  private unsubs: Unsubscribe[] = [];
  private hostUnsubs: Unsubscribe[] = [];

  private players: PlayerInfo[] = [];
  private owners: StationOwners = { cashier: null, tea: null, topping: null, stock: null };
  private hostUid: string;
  private ownerUid: string;
  private status: RoomInfo['status'] = 'lobby';
  /** Host cho phép người giữ trạm Kho chi tiền két. */
  private allowSpending = false;
  private connected = false;
  private live = new Map<string, LivePour>();

  // Máy khác: thao tác đã gửi mà host chưa xác nhận
  private pending: PendingAction[] = [];
  private nextSeq = 1;
  private lastStateSeq = -1;
  /** State gốc nhận từ host gần nhất (chưa áp thao tác đang chờ) — dùng khi mình lên làm host. */
  private lastDecoded: ShopState | null = null;
  private lastAcks: Record<string, number> = {};

  // Host: hàng đợi sự kiện chờ gửi, số thao tác đã xử lý của từng người
  private outbox: TaggedEvent[] = [];
  private acks: Record<string, number> = {};
  private stateSeq = 0;
  private dirty = false;
  private actionDirty = false;
  private lastWrite = 0;
  private lastHousekeeping = 0;

  // Theo dõi host offline để chuyển host
  private hostOfflineSince: number | null = null;
  private lastLiveSend = 0;
  private liveActive = false;

  constructor(session: RoomSession, initial: ShopState) {
    this.session = session;
    this.localId = session.uid;
    this.code = session.code;
    this.ownerUid = session.ownerUid;
    this.hostUid = session.ownerUid;
    this.state = { ...initial, solo: false };
    this.history = initial.history;
    this.listen();
  }

  // ───────────── NetAdapter ─────────────

  get isHost(): boolean {
    return this.hostUid === this.localId;
  }

  getState(): ShopState {
    return this.state;
  }

  getConfirmedState(): ShopState {
    return this.isHost ? this.state : (this.lastDecoded ?? this.state);
  }

  get ownerId(): string {
    return this.ownerUid;
  }

  /** Đổi outfit giữa chừng: mọi người thấy ngay. */
  async setOutfit(outfit: string): Promise<void> {
    await update(this.ref(`players/${this.localId}`), { outfit }).catch(() => undefined);
  }

  getOwners(): StationOwners {
    return this.owners;
  }

  getPlayers(): PlayerInfo[] {
    return this.players;
  }

  /** Tên người chơi trong phòng (uid → tên). */
  private playerNames(): Record<string, string> {
    return Object.fromEntries(this.players.map((p) => [p.uid, p.name]));
  }

  private get spendRule(): SpendRule {
    return { ownerUid: this.ownerUid, allowStock: this.allowSpending };
  }

  canSpend(): boolean {
    return canSpend(this.owners, this.localId, this.spendRule);
  }

  /** Host bật / tắt quyền chi két cho trạm Kho. */
  async setAllowSpending(on: boolean): Promise<void> {
    if (!this.isHost) return;
    await update(this.ref('meta'), { allowSpending: on });
  }

  getRoomInfo(): RoomInfo {
    return {
      code: this.code,
      status: this.status,
      hostUid: this.hostUid,
      ownerUid: this.ownerUid,
      players: this.players,
      connected: this.connected,
      allowSpending: this.allowSpending,
    };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onRoom(listener: (info: RoomInfo) => void): () => void {
    this.roomListeners.add(listener);
    listener(this.getRoomInfo());
    return () => this.roomListeners.delete(listener);
  }

  dispatch(action: Action): void {
    const reason = canPerform(this.state, this.owners, this.localId, action, this.isHost, this.spendRule);
    if (reason) {
      this.emit([{ type: 'rejected', action: action.type, reason }]);
      return;
    }
    if (this.isHost) {
      this.hostApply(this.localId, action);
      return;
    }
    // Máy khác: áp dụng ngay cho mượt, rồi gửi cho host
    const seq = this.nextSeq++;
    this.pending.push({ seq, action });
    const result = reduce(this.state, action, this.localId);
    this.state = result.state;
    this.emit(result.events);
    void push(this.ref('actions'), clean({ uid: this.localId, seq, action, t: serverTimestamp() }));
  }

  update(dtMs: number): void {
    const now = Date.now();
    const dt = Math.min(dtMs, MAX_TICK_MS);
    if (this.status === 'playing') {
      if (this.isHost) {
        this.hostStep(dt);
      } else {
        // Chạy đồng hồ / kiên nhẫn trên máy cho mượt; state của host sẽ ghi đè khi tới
        this.state = reduce(this.state, { type: 'TICK', dt }).state;
        this.emit([]);
      }
    }
    if (this.isHost) this.flushState(now);
    if (now - this.lastHousekeeping > 1000) {
      this.lastHousekeeping = now;
      this.housekeeping(now);
    }
  }

  setLivePour(pour: { cupId: string; tea: string; amount: number } | null): void {
    const myLive = this.ref(`live/${this.localId}`);
    if (!pour) {
      if (this.liveActive) void remove(myLive);
      this.liveActive = false;
      return;
    }
    const now = Date.now();
    if (now - this.lastLiveSend < ROOM.liveEveryMs) return;
    this.lastLiveSend = now;
    this.liveActive = true;
    void set(myLive, { cupId: pour.cupId, tea: pour.tea, amount: Math.round(pour.amount * 1000) / 1000 });
  }

  getLivePours(): LivePour[] {
    return [...this.live.values()].filter((l) => l.uid !== this.localId);
  }

  sendEmote(kind: EmoteKind): void {
    const r = push(this.ref('emotes'), { uid: this.localId, kind, t: serverTimestamp() });
    window.setTimeout(() => void remove(r), ROOM.emoteLifetimeMs);
  }

  onEmote(listener: (uid: string, kind: EmoteKind) => void): () => void {
    this.emoteListeners.add(listener);
    return () => this.emoteListeners.delete(listener);
  }

  /** Chọn trạm (null = bỏ trạm). */
  async chooseStation(station: Station | null): Promise<void> {
    await update(this.ref(`players/${this.localId}`), { station });
  }

  /** Chủ phòng bấm "Mở cửa": bắt đầu ngày. */
  async openShop(): Promise<void> {
    if (!this.isHost) return;
    await update(this.ref('meta'), { status: 'playing' });
  }

  /**
   * Rời phòng. Host rời thì giao host cho người vào sớm nhất còn lại; người cuối cùng thì xóa phòng.
   * Chủ tiệm rời thì đóng phòng: mọi người quay về tiệm của mình (tiệm là của chủ tiệm).
   */
  async leave(): Promise<void> {
    const others = this.players.filter((p) => p.uid !== this.localId).sort((a, b) => a.joinedAt - b.joinedAt);
    if (this.isHost) this.flushState(Date.now(), true);
    try {
      if (this.localId === this.ownerUid && others.length > 0 && this.status !== 'closed') {
        await update(this.ref('meta'), { status: 'closed' });
      }
      if (others.length === 0) {
        await remove(ref(this.session.db, `rooms/${this.code}`));
        await remove(ref(this.session.db, `userRooms/${this.ownerUid}/${this.code}`)).catch(() => undefined);
      } else {
        if (this.isHost) {
          const next = others.find((p) => p.online) ?? others[0];
          await update(this.ref('meta'), { hostUid: next.uid });
        }
        await remove(this.ref(`live/${this.localId}`));
        await remove(this.ref(`players/${this.localId}`));
        await releaseSeat(this.session.db, this.code, this.localId);
      }
    } catch {
      // Mất mạng lúc rời: onDisconnect sẽ báo offline, host sẽ nhả trạm sau
    }
    this.destroy();
  }

  destroy(): void {
    for (const u of [...this.unsubs, ...this.hostUnsubs]) u();
    this.unsubs = [];
    this.hostUnsubs = [];
    this.listeners.clear();
    this.roomListeners.clear();
    this.emoteListeners.clear();
  }

  // ───────────── Nghe Firebase ─────────────

  private ref(path: string): DatabaseReference {
    return ref(this.session.db, `rooms/${this.code}/${path}`);
  }

  private listen(): void {
    const db = this.session.db;
    const me = this.ref(`players/${this.localId}`);
    // Presence: mất kết nối thì Firebase tự ghi online=false; có mạng lại thì báo online
    this.unsubs.push(
      onValue(ref(db, '.info/connected'), (snap) => {
        this.connected = snap.val() === true;
        if (this.connected) {
          void onDisconnect(me).update({ online: false, lastSeen: serverTimestamp() });
          void onDisconnect(this.ref(`live/${this.localId}`)).remove();
          // Có mạng lại: giữ (hoặc giành lại) ghế rồi báo online
          void claimSeat(db, this.code, this.localId)
            .then((ok) => (ok ? update(me, { online: true, lastSeen: serverTimestamp() }) : undefined))
            .catch(() => undefined);
        }
        this.notifyRoom();
      }),
    );
    this.unsubs.push(
      onValue(this.ref('meta'), (snap) => {
        const meta = snap.val() as {
          hostUid?: string;
          ownerUid?: string;
          status?: string;
          allowSpending?: boolean;
        } | null;
        if (!meta) return;
        const wasHost = this.isHost;
        this.hostUid = meta.hostUid ?? this.hostUid;
        this.ownerUid = meta.ownerUid ?? this.ownerUid;
        this.status = meta.status === 'playing' || meta.status === 'closed' ? meta.status : 'lobby';
        this.allowSpending = meta.allowSpending === true;
        this.owners = stationOwners(this.players, this.hostUid);
        if (!wasHost && this.isHost) this.becomeHost();
        if (wasHost && !this.isHost) this.stopHosting();
        this.notifyRoom();
      }),
    );
    this.unsubs.push(
      onValue(this.ref('players'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, Partial<PlayerInfo>>;
        this.players = Object.entries(raw)
          .map(([uid, p]) => ({
            uid,
            name: p.name ?? '',
            station: (p.station ?? null) as Station | null,
            online: p.online !== false,
            joinedAt: p.joinedAt ?? 0,
            outfit: p.outfit ?? DEFAULT_OUTFIT,
            color: outfitColor(p.outfit ?? DEFAULT_OUTFIT),
          }))
          .sort((a, b) => a.joinedAt - b.joinedAt);
        this.owners = stationOwners(this.players, this.hostUid);
        this.notifyRoom();
        this.emit([]);
      }),
    );
    this.unsubs.push(onValue(this.ref('state'), (snap) => this.onStateSnapshot(snap.val() as StatePayload | null)));
    this.unsubs.push(
      onValue(this.ref('live'), (snap) => {
        const raw = (snap.val() ?? {}) as Record<string, Omit<LivePour, 'uid'>>;
        this.live = new Map(Object.entries(raw).map(([uid, l]) => [uid, { ...l, uid }]));
      }),
    );
    const joinedAt = Date.now();
    this.unsubs.push(
      onChildAdded(this.ref('emotes'), (snap) => {
        const e = snap.val() as { uid: string; kind: EmoteKind; t?: number } | null;
        // Bỏ qua biểu cảm cũ đã có trước lúc mình vào
        if (!e || (typeof e.t === 'number' && e.t < joinedAt - 2000)) return;
        for (const l of this.emoteListeners) l(e.uid, e.kind);
      }),
    );
    if (this.isHost) this.becomeHost();
  }

  /** Nhận state mới từ host (máy khác). */
  private onStateSnapshot(payload: StatePayload | null): void {
    if (!payload || this.isHost) return;
    const decoded = decodeState(payload.data, this.history);
    if (!decoded) return;
    if (payload.seq === this.lastStateSeq) return;
    this.lastStateSeq = payload.seq;
    this.lastDecoded = decoded;
    this.lastAcks = payload.acks ?? {};
    // Bỏ các thao tác host đã xử lý, áp lại phần còn lại (không phát sự kiện lần nữa)
    const ack = payload.acks?.[this.localId] ?? 0;
    this.pending = this.pending.filter((p) => p.seq > ack);
    let state = decoded;
    for (const p of this.pending) state = reduce(state, p.action, this.localId).state;
    this.state = state;
    // Sự kiện từ host: bỏ những gì chính mình đã thấy trước (trừ khi host từ chối thao tác của mình)
    const events: GameEvent[] = [];
    for (const t of payload.events ?? []) {
      const mine = t.uid === this.localId;
      if (t.e.type === 'rejected') {
        if (mine) events.push(t.e);
      } else if (!mine) {
        events.push(t.e);
      }
      const e = t.e;
      if (e.type === 'dayEnded' && !this.history.some((h) => h.day === e.summary.day)) {
        this.history = [...this.history, e.summary];
      }
    }
    this.emit(events);
  }

  // ───────────── Host ─────────────

  private becomeHost(): void {
    if (this.hostUnsubs.length > 0) return;
    // Quay về state gốc của host cũ: các thao tác mình đang chờ vẫn nằm trong /actions và sẽ được xử lý lại đúng một lần
    if (this.lastDecoded) this.state = this.lastDecoded;
    this.acks = { ...this.lastAcks, ...this.acks };
    this.pending = [];
    this.stateSeq = Math.max(this.stateSeq, this.lastStateSeq + 1);
    this.dirty = true;
    // Xử lý thao tác mọi người gửi lên (kể cả những cái đang chờ từ host cũ)
    this.hostUnsubs.push(
      onChildAdded(this.ref('actions'), (snap) => {
        const msg = snap.val() as { uid: string; seq: number; action: Action } | null;
        void remove(snap.ref);
        if (!msg || !msg.action) return;
        if ((this.acks[msg.uid] ?? 0) >= msg.seq) return;
        this.acks[msg.uid] = msg.seq;
        this.hostApply(msg.uid, msg.action, msg.seq);
      }),
    );
  }

  private stopHosting(): void {
    for (const u of this.hostUnsubs) u();
    this.hostUnsubs = [];
    this.outbox = [];
  }

  /** Host áp dụng một thao tác (của mình hoặc người khác) sau khi kiểm tra quyền. */
  private hostApply(uid: string, action: Action, seq?: number): void {
    const reason = canPerform(this.state, this.owners, uid, action, uid === this.localId, this.spendRule);
    let events: GameEvent[];
    if (reason) {
      events = [{ type: 'rejected', action: action.type, reason }];
    } else {
      const result = reduce(this.state, action, uid);
      this.state = result.state;
      events = result.events;
    }
    for (const e of events) this.outbox.push({ e, uid, seq });
    // Sự kiện thao tác của chính host thì hiện ngay; của người khác thì host cũng thấy (trừ lời từ chối)
    this.emit(uid === this.localId ? events : events.filter((e) => e.type !== 'rejected'));
    this.actionDirty = true;
  }

  /** Mỗi khung hình: thời gian trôi, khách đến, đóng cửa. */
  private hostStep(dt: number): void {
    const events: GameEvent[] = [];
    const tick = reduce(this.state, { type: 'TICK', dt });
    this.state = tick.state;
    events.push(...tick.events);
    for (const planned of planHostActions(this.state)) {
      // Đóng cửa: gắn tên mọi người trong phòng (bảng xếp hạng, bảng thành tích) và người giữ trạm Kho
      const a =
        planned.type === 'END_DAY'
          ? { ...planned, names: this.playerNames(), manager: this.owners.stock ?? undefined }
          : planned;
      const r = reduce(this.state, a);
      this.state = r.state;
      events.push(...r.events);
    }
    for (const e of events) this.outbox.push({ e });
    this.dirty = true;
    this.emit(events);
  }

  private flushState(now: number, force = false): void {
    const due =
      force ||
      (this.actionDirty && now - this.lastWrite >= ROOM.stateWriteAfterActionMs) ||
      (this.dirty && now - this.lastWrite >= ROOM.stateWriteEveryMs);
    if (!due) return;
    this.lastWrite = now;
    this.dirty = false;
    this.actionDirty = false;
    this.stateSeq++;
    const payload: StatePayload = {
      data: encodeState(this.state),
      seq: this.stateSeq,
      events: this.outbox.map((t) => clean(t)),
      acks: { ...this.acks },
    };
    this.outbox = [];
    void set(this.ref('state'), payload).catch(() => undefined);
  }

  // ───────────── Ổn định: nhả trạm, chuyển host ─────────────

  private housekeeping(now: number): void {
    // Host: nhả trạm của người offline quá lâu
    if (this.isHost) {
      for (const p of this.players) {
        if (!p.online && p.uid !== this.localId) {
          const since = this.offlineSince.get(p.uid) ?? now;
          this.offlineSince.set(p.uid, since);
          // Chỉ ghi một lần cho mỗi việc (không ghi lại mỗi giây)
          if (p.station && now - since > ROOM.releaseStationAfterMs) void update(this.ref(`players/${p.uid}`), { station: null });
          if (now - since > ROOM.freeSeatAfterMs && !this.freedSeats.has(p.uid)) {
            this.freedSeats.add(p.uid);
            void releaseSeat(this.session.db, this.code, p.uid);
          }
        } else {
          this.offlineSince.delete(p.uid);
          this.freedSeats.delete(p.uid);
        }
      }
    }
    // Máy khác: host offline (hoặc đã rời) quá lâu → người vào sớm nhất còn online nhận làm host
    if (!this.isHost && this.connected) {
      const host = this.players.find((p) => p.uid === this.hostUid);
      const hostGone = !host || !host.online;
      if (!hostGone) {
        this.hostOfflineSince = null;
        return;
      }
      this.hostOfflineSince ??= now;
      if (now - this.hostOfflineSince < ROOM.hostTimeoutMs) return;
      const candidate = this.players.find((p) => p.online && p.uid !== this.hostUid);
      if (candidate?.uid !== this.localId) return;
      const oldHost = this.hostUid;
      void runTransaction(this.ref('meta/hostUid'), (current) => (current === oldHost ? this.localId : undefined));
    }
  }

  private offlineSince = new Map<string, number>();
  private freedSeats = new Set<string>();

  // ───────────── Phát cho giao diện ─────────────

  private emit(events: GameEvent[]): void {
    for (const l of this.listeners) l(this.state, events);
  }

  private notifyRoom(): void {
    const info = this.getRoomInfo();
    for (const l of this.roomListeners) l(info);
  }
}
