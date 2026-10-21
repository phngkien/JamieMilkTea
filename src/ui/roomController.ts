// Điều phối luồng phòng chơi chung: menu → tạo / vào phòng → phòng chờ → chơi → rời phòng.
// Firebase chỉ được tải (import động) khi người chơi thật sự mở phòng.
import { ROOM_TEXT, fill } from '../config/strings';
import type { ShopState, Station } from '../core/types';
import type { FirebaseAdapter } from '../net/FirebaseAdapter';
import type { NetAdapter, RoomInfo } from '../net/NetAdapter';
import type { RoomSession } from '../net/room';
import { codeFromHash, inviteLink, isValidCode, normalizeCode } from '../net/roomCode';
import { lobbyKey, renderCreate, renderJoin, renderLobby, renderRoomMenu } from './roomScreens';
import type { Overlay } from './overlay';

export interface RoomHooks {
  getAdapter: () => NetAdapter;
  /** Thay adapter đang chạy (solo ↔ phòng) và dựng lại cảnh. */
  switchAdapter: (adapter: NetAdapter) => void;
  /** State tiệm của mình để mang vào phòng khi mở tiệm cho bạn bè. */
  shopForRoom: () => ShopState;
  /** Rời phòng: quay lại chơi một mình. `roomState` có khi mình là chủ tiệm (giữ tiến trình). */
  backToSolo: (roomState: ShopState | null) => Promise<void>;
  getName: () => string;
  setName: (name: string) => void;
  /** Outfit đang mặc (mang vào phòng). */
  getOutfit: () => string;
  /** Đăng nhập / đồng bộ cloud (trước khi mở phòng). */
  connect: () => Promise<void>;
  /** Vừa mở phòng ở tiệm của mình: gắn tiệm với phòng trên cloud. */
  onRoomCreated: (shop: ShopState, code: string) => Promise<void>;
  /** Trước khi rời phòng: lưu và đẩy tiến độ lên cloud. */
  beforeLeave: () => Promise<void>;
}

export class RoomController {
  private overlay: Overlay;
  private hooks: RoomHooks;
  private unsubRoom: (() => void) | null = null;
  private lastLobbyKey = '';
  private lastInfo: RoomInfo | null = null;
  private busy = false;

  constructor(overlay: Overlay, hooks: RoomHooks) {
    this.overlay = overlay;
    this.hooks = hooks;
  }

  private get room(): FirebaseAdapter | null {
    const a = this.hooks.getAdapter();
    return a.mode === 'room' ? (a as FirebaseAdapter) : null;
  }

  /** Nút "Mời bạn" trên HUD. */
  open(): void {
    if (this.room) this.showLobby();
    else this.showMenu();
  }

  /** Mở game bằng link #join-MÃ thì vào thẳng màn nhập tên. */
  openFromHash(hash: string): boolean {
    const code = codeFromHash(hash);
    if (!code) return false;
    history.replaceState(null, '', window.location.pathname + window.location.search);
    this.showJoin(code);
    return true;
  }

  private showMenu(): void {
    this.overlay.modal.open('room', renderRoomMenu(), (action) => {
      if (action === 'close') this.overlay.modal.close();
      else if (action === 'create') this.showCreate();
      else if (action === 'join') this.showJoin('');
    });
  }

  private readName(): string {
    const input = document.getElementById('room-name') as HTMLInputElement | null;
    const name = (input?.value ?? '').trim().slice(0, 16);
    if (name) this.hooks.setName(name);
    return name;
  }

  private showCreate(error = ''): void {
    this.overlay.modal.open('room', renderCreate(this.hooks.getName(), error, this.busy), (action) => {
      if (action === 'back') this.showMenu();
      else if (action === 'do-create') void this.doCreate();
    });
  }

  private showJoin(code: string, error = ''): void {
    this.overlay.modal.open('room', renderJoin(this.hooks.getName(), code, error, this.busy), (action) => {
      if (action === 'back') this.showMenu();
      else if (action === 'do-join') void this.doJoin();
    });
  }

  private async doCreate(): Promise<void> {
    const name = this.readName();
    if (!name) return this.showCreate(ROOM_TEXT.errName);
    this.busy = true;
    this.showCreate();
    try {
      const shop = this.hooks.shopForRoom();
      const [{ createRoom }, { FirebaseAdapter }] = await Promise.all([import('../net/room'), import('../net/FirebaseAdapter')]);
      await this.hooks.connect();
      const session = await createRoom(name, this.hooks.getOutfit(), shop);
      await this.hooks.onRoomCreated(shop, session.code);
      this.enterRoom(new FirebaseAdapter(session, { ...shop, solo: false }));
    } catch {
      this.busy = false;
      this.showCreate(navigator.onLine ? ROOM_TEXT.errCreate : ROOM_TEXT.errOffline);
      return;
    }
    this.busy = false;
  }

  private async doJoin(): Promise<void> {
    const codeInput = document.getElementById('room-code') as HTMLInputElement | null;
    const code = normalizeCode(codeInput?.value ?? '');
    const name = this.readName();
    if (!isValidCode(code)) return this.showJoin(code, ROOM_TEXT.errCode);
    if (!name) return this.showJoin(code, ROOM_TEXT.errName);
    this.busy = true;
    this.showJoin(code);
    let result: RoomSession | 'notFound' | 'full' | 'offline';
    try {
      const { joinRoom } = await import('../net/room');
      await this.hooks.connect();
      result = await joinRoom(code, name, this.hooks.getOutfit());
    } catch {
      result = 'offline';
    }
    if (typeof result === 'string') {
      this.busy = false;
      const msg = { notFound: ROOM_TEXT.errNotFound, full: ROOM_TEXT.errFull, offline: ROOM_TEXT.errOffline }[result];
      return this.showJoin(code, msg);
    }
    const { FirebaseAdapter } = await import('../net/FirebaseAdapter');
    // State thật sẽ tới từ chủ phòng sau một chút; tạm dùng tiệm của mình để vẽ cảnh
    this.enterRoom(new FirebaseAdapter(result, { ...this.hooks.shopForRoom(), solo: false }));
    this.busy = false;
  }

  private enterRoom(adapter: FirebaseAdapter): void {
    this.hooks.switchAdapter(adapter);
    this.lastInfo = null;
    this.unsubRoom?.();
    this.unsubRoom = adapter.onRoom((info) => this.onRoomInfo(info));
    this.overlay.setRoomMode(true);
    this.showLobby();
  }

  /** Báo người vào / ra / đổi host / mất mạng; vẽ lại phòng chờ khi cần. */
  private onRoomInfo(info: RoomInfo): void {
    const room = this.room;
    if (!room) return;
    const prev = this.lastInfo;
    this.lastInfo = info;
    if (prev) {
      const before = new Set(prev.players.map((p) => p.uid));
      const after = new Set(info.players.map((p) => p.uid));
      for (const p of info.players) if (!before.has(p.uid)) this.overlay.toast.show(fill(ROOM_TEXT.joined, { name: p.name }));
      for (const p of prev.players) if (!after.has(p.uid)) this.overlay.toast.show(fill(ROOM_TEXT.left, { name: p.name }), 'warn');
      if (prev.hostUid !== info.hostUid) {
        const host = info.players.find((p) => p.uid === info.hostUid);
        this.overlay.toast.show(
          info.hostUid === room.localId ? ROOM_TEXT.youAreHost : fill(ROOM_TEXT.newHost, { name: host?.name ?? '' }),
          'info',
          3000,
        );
      }
      if (prev.connected && !info.connected) this.overlay.toast.show(ROOM_TEXT.lostConnection, 'warn', 4000);
      if (!prev.connected && info.connected) this.overlay.toast.show(ROOM_TEXT.backOnline);
      // Chủ phòng vừa mở cửa: đóng phòng chờ cho mọi người
      if (prev.status === 'lobby' && info.status === 'playing' && this.overlay.modal.current === 'room') {
        this.overlay.modal.close();
      }
    }
    // Chủ tiệm đã đóng phòng: ai cũng quay về tiệm của mình
    if (info.status === 'closed' && room.localId !== info.ownerUid) {
      this.overlay.toast.show(ROOM_TEXT.closedByOwner, 'warn', 4000);
      void this.leave();
      return;
    }
    this.overlay.setRoomBadge(info.code);
    if (this.overlay.modal.current === 'room' && this.overlay.modal.tag === 'lobby') {
      const key = lobbyKey(info, room.getOwners());
      if (key !== this.lastLobbyKey) {
        this.lastLobbyKey = key;
        this.overlay.modal.update(renderLobby(info, room.localId, room.getOwners(), inviteLink(info.code)));
      }
    }
  }

  showLobby(): void {
    const room = this.room;
    if (!room) return;
    const info = room.getRoomInfo();
    this.lastLobbyKey = lobbyKey(info, room.getOwners());
    this.overlay.modal.open(
      'room',
      renderLobby(info, room.localId, room.getOwners(), inviteLink(info.code)),
      (action, data) => void this.onLobbyAction(action, data),
      'lobby',
    );
  }

  private async onLobbyAction(action: string, data: DOMStringMap): Promise<void> {
    const room = this.room;
    if (!room) return;
    if (action === 'close') this.overlay.modal.close();
    else if (action === 'open') await room.openShop();
    else if (action === 'allow-spending') await room.setAllowSpending(!room.getRoomInfo().allowSpending);
    else if (action === 'station') {
      const s = data.station as Station;
      const current = room.getPlayers().find((p) => p.uid === room.localId)?.station ?? null;
      await room.chooseStation(current === s ? null : s);
    } else if (action === 'copy') await this.copyInvite(room.code);
    else if (action === 'leave') await this.leave();
  }

  private async copyInvite(code: string): Promise<void> {
    const link = inviteLink(code);
    const text = fill(ROOM_TEXT.inviteMessage, { code, link });
    try {
      // Điện thoại: mở bảng chia sẻ (Zalo, Messenger...); máy tính: chép vào bộ nhớ tạm
      if (navigator.share && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      this.overlay.toast.show(ROOM_TEXT.copied);
    } catch {
      // Người dùng hủy chia sẻ hoặc trình duyệt chặn: hiện sẵn mã để chép tay
      this.overlay.toast.show(`${ROOM_TEXT.code}: ${code}`, 'info', 4000);
    }
  }

  async leave(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const isOwner = room.localId === room.getRoomInfo().ownerUid;
    const state = room.getState();
    this.unsubRoom?.();
    this.unsubRoom = null;
    this.overlay.modal.close();
    this.overlay.setRoomMode(false);
    await this.hooks.beforeLeave();
    await room.leave();
    await this.hooks.backToSolo(isOwner ? state : null);
  }
}
