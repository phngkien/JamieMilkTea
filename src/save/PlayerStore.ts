// Giữ và lưu dữ liệu của người chơi trên máy này: cài đặt, profile, sổ ghi tip, thông tin tiệm.
// Lưu trên máy ngay (IndexedDB + localStorage), rồi đẩy lên cloud sau vài giây khi có mạng.
// Quy tắc xung đột nằm trong save/sync.ts (có test).
import { CLOUD } from '../config/cloud';
import { creditProfile, ledgerKey, type Ledger } from '../core/profile';
import type { DaySummary, GameEvent, Profile, ShopState } from '../core/types';
import type { AccountInfo } from '../net/cloud';
import type { FirebaseAdapter } from '../net/FirebaseAdapter';
import type { NetAdapter } from '../net/NetAdapter';
import type { SaveRepository } from './SaveRepository';
import { createSave, shopSaveOf, type SaveData, type Settings, type ShopMeta, type ShopSave } from './schema';
import { resolveProfile, resolveShop } from './sync';

type CloudModule = typeof import('../net/cloud');

export interface StoreHooks {
  getAdapter: () => NetAdapter;
  /** Chơi một mình: thay tiệm đang chơi bằng bản này (lấy từ cloud). */
  replaceShop: (shop: ShopSave) => void;
  /** Profile vừa đổi (đồng bộ về, mua outfit...). */
  onProfile: (profile: Profile) => void;
  onAccount: (info: AccountInfo | null) => void;
  /** Báo cho người chơi (ví dụ: đã tải tiệm từ cloud). */
  notify: (message: 'shopFromCloud' | 'shopConflict') => void;
}

export class PlayerStore {
  settings: Settings;
  profile: Profile;
  ledger: Ledger;
  meta: ShopMeta;
  /** Mã tài khoản đã tạo (để xem lại). */
  loginCode: string | null = null;
  account: AccountInfo | null = null;
  cloud: CloudModule | null = null;
  /** Đang tải Firebase / đồng bộ lần đầu. */
  connecting = false;

  private repo: SaveRepository;
  private hooks: StoreHooks;
  /** Bản tiệm lưu gần nhất trên máy (của chính mình). */
  private lastShop: ShopSave | null;
  private pushTimer = 0;
  private profileDirty = false;
  private shopDirty = false;
  /** Chủ phòng: các ngày vừa kết thúc trong phòng, chờ ghi lên tiệm của chủ tiệm. */
  private pendingDays: DaySummary[] = [];
  private syncing: Promise<void> | null = null;
  private resetting = false;

  constructor(repo: SaveRepository, saved: SaveData, hooks: StoreHooks) {
    this.repo = repo;
    this.hooks = hooks;
    this.settings = saved.settings;
    this.profile = saved.profile;
    this.ledger = saved.ledger;
    this.meta = { ownerUid: saved.shop.ownerUid, cloudBase: saved.shop.cloudBase };
    this.lastShop = saved.shop;
  }

  /** Mình là chủ tiệm đang chơi (chơi một mình, hoặc phòng mở ở tiệm của mình). */
  ownsShop(): boolean {
    const a = this.hooks.getAdapter();
    return a.mode === 'solo' || (a as FirebaseAdapter).ownerId === a.localId;
  }

  // ───────────── Lưu trên máy ─────────────

  /** Lưu trên máy ngay, rồi hẹn đẩy lên cloud. */
  save(): void {
    if (this.resetting) return;
    const adapter = this.hooks.getAdapter();
    if (this.ownsShop()) {
      const data = createSave(adapter.getState(), this.settings, { profile: this.profile, ledger: this.ledger, meta: this.meta });
      this.lastShop = data.shop;
      this.shopDirty = true;
      void this.repo.save(data);
    } else {
      // Đang làm ở tiệm bạn: chỉ lưu profile + cài đặt, giữ nguyên tiệm của mình trên máy
      const shop = this.lastShop;
      if (shop) {
        void this.repo.save({
          ...createSave(adapter.getState(), this.settings, { profile: this.profile, ledger: this.ledger }),
          shop,
        });
      }
    }
    // Chủ phòng ghi tiến độ lên tiệm của chủ tiệm (kể cả khi mình không phải chủ tiệm)
    if (adapter.mode === 'room' && adapter.isHost) this.shopDirty = true;
    this.schedulePush();
  }

  /**
   * "Chơi lại từ đầu": xóa tiệm trên máy và trên cloud (profile, tip, outfit vẫn giữ).
   * Không có mạng thì chỉ xóa được trên máy — lần sau có mạng, tiệm cũ trên cloud sẽ quay về.
   */
  async resetShop(fresh: ShopState): Promise<void> {
    this.resetting = true;
    window.clearTimeout(this.pushTimer);
    const uid = this.account?.uid;
    const now = Date.now();
    let cloudBase = 0;
    if (this.cloud && uid && (await this.cloud.resetShop(uid, shopSaveOf(fresh, { ownerUid: uid, cloudBase: 0 }, now)))) {
      cloudBase = now;
    }
    await this.repo.clear();
    // Giữ profile + cài đặt; tiệm mới tinh, đã khớp với cloud
    await this.repo.save(
      createSave(fresh, this.settings, {
        profile: this.profile,
        ledger: this.ledger,
        meta: { ownerUid: uid ?? '', cloudBase },
        now,
      }),
    );
  }

  /** Profile đổi (mua outfit, đổi tên...): lưu và đẩy lên. */
  setProfile(profile: Profile): void {
    this.profile = profile;
    this.profileDirty = true;
    this.hooks.onProfile(profile);
    this.save();
  }

  /**
   * Cộng tip và thống kê của mình (từ state đã được chủ phòng xác nhận) vào profile.
   * Gọi sau mỗi lần state đổi; không có gì mới thì không làm gì.
   */
  credit(events: GameEvent[]): { changed: boolean; gained: number } {
    const adapter = this.hooks.getAdapter();
    for (const e of events) if (e.type === 'dayEnded' && adapter.isHost) this.pendingDays.push(e.summary);
    const state = adapter.getConfirmedState();
    const mine = state.today.staff[adapter.localId];
    if (!mine || !state.runId) return { changed: false, gained: 0 };
    const r = creditProfile(this.profile, this.ledger, ledgerKey(state.runId, state.day), mine, Date.now());
    if (r.profile === this.profile) return { changed: false, gained: 0 };
    this.profile = r.profile;
    this.ledger = r.ledger;
    this.profileDirty = true;
    return { changed: true, gained: r.gained };
  }

  /** Tiệm của mình lưu gần nhất trên máy (để quay về sau khi rời phòng của bạn). */
  myShop(): ShopSave | null {
    return this.lastShop;
  }

  // ───────────── Cloud ─────────────

  /** Tải Firebase, đăng nhập (khách nếu chưa có), đồng bộ lần đầu. Không có mạng thì thôi, lần sau thử lại. */
  async startCloud(): Promise<void> {
    if (this.cloud && this.account) return this.sync();
    if (this.connecting) return;
    this.connecting = true;
    try {
      const cloud = await import('../net/cloud');
      const info = await cloud.startCloud();
      if (!info) return;
      this.cloud = cloud;
      this.account = info;
      this.hooks.onAccount(info);
      await this.sync();
      // Đổi tài khoản (đăng nhập bằng mã / Google trên máy này): lấy dữ liệu của tài khoản mới
      cloud.onAccountChange((next) => {
        const prev = this.account;
        this.account = next;
        this.hooks.onAccount(next);
        if (next && prev && next.uid !== prev.uid) void this.sync(true);
      });
    } catch {
      // Không tải được Firebase (mất mạng): chơi tiếp trên máy
    } finally {
      this.connecting = false;
    }
  }

  /** Cập nhật thông tin tài khoản sau khi liên kết Google / tạo mã (uid không đổi). */
  refreshAccount(): void {
    this.account = this.cloud?.accountInfo() ?? this.account;
    this.hooks.onAccount(this.account);
  }

  /**
   * Đồng bộ profile và tiệm với cloud. `switched` = vừa đổi sang tài khoản khác:
   * dữ liệu trên máy coi như của người lạ → tài khoản mới đã có gì trên cloud thì lấy cái đó.
   */
  sync(switched = false): Promise<void> {
    this.syncing ??= this.doSync(switched).finally(() => {
      this.syncing = null;
    });
    return this.syncing;
  }

  private async doSync(switched: boolean): Promise<void> {
    const cloud = this.cloud;
    const uid = this.account?.uid;
    if (!cloud || !uid) return;
    // Tiệm trên máy đang là của tài khoản khác (vừa đăng nhập bằng mã / Google)
    const foreign = switched || (this.meta.ownerUid !== '' && this.meta.ownerUid !== uid);
    let remote;
    try {
      remote = await Promise.all([cloud.fetchShop(uid), cloud.fetchProfile(uid)]);
    } catch {
      return; // mất mạng giữa chừng: lần sau thử lại
    }
    const [cloudShop, cloudProfile] = remote;

    // Profile: bản mới hơn thắng (đổi tài khoản thì tin cloud nếu có)
    const pr = resolveProfile(foreign && cloudProfile.profile ? null : this.profile, cloudProfile.profile);
    if (pr.use === 'cloud' && pr.data) {
      this.profile = { ...pr.data, uid };
      this.hooks.onProfile(this.profile);
    } else {
      this.profile = { ...this.profile, uid };
    }
    this.profileDirty = pr.push || this.profileDirty;
    this.loginCode = cloudProfile.loginCode ?? (foreign ? null : this.loginCode);

    // Tiệm: chỉ khi đang chơi một mình (trong phòng thì state do chủ phòng giữ)
    const adapter = this.hooks.getAdapter();
    if (adapter.mode === 'solo') {
      this.save(); // chốt state hiện tại vào lastShop
      const local = this.lastShop ? { ...this.lastShop, cloudBase: foreign ? 0 : this.lastShop.cloudBase } : null;
      const rs = resolveShop(local, cloudShop);
      if (rs.use === 'cloud' && rs.data) {
        this.meta = { ownerUid: uid, cloudBase: rs.data.updatedAt };
        if (rs.data.updatedAt !== this.lastShop?.updatedAt) {
          this.hooks.replaceShop(rs.data);
          this.hooks.notify('shopFromCloud');
        }
        this.shopDirty = false;
      } else {
        this.meta = { ownerUid: uid, cloudBase: local?.cloudBase ?? 0 };
        this.shopDirty = rs.push;
      }
      this.save();
      if (!rs.push) this.shopDirty = false;
    }
    await this.pushNow();
  }

  private schedulePush(): void {
    if (!this.cloud) return;
    window.clearTimeout(this.pushTimer);
    this.pushTimer = window.setTimeout(() => void this.pushNow(), CLOUD.pushDelayMs);
  }

  /** Đẩy ngay những gì đã đổi (gọi khi ẩn tab, rời phòng...). */
  async pushNow(): Promise<void> {
    window.clearTimeout(this.pushTimer);
    const cloud = this.cloud;
    const uid = this.account?.uid;
    if (!cloud || !uid) return;
    if (this.profileDirty) {
      this.profileDirty = false;
      if (!(await cloud.pushProfile(this.profile))) this.profileDirty = true;
    }
    if (!this.shopDirty) return;
    this.shopDirty = false;
    const adapter = this.hooks.getAdapter();
    if (adapter.mode === 'room') {
      if (!adapter.isHost) return;
      const room = adapter as FirebaseAdapter;
      const now = Date.now();
      const shop = shopSaveOf(adapter.getState(), { ownerUid: room.ownerId, cloudBase: 0 }, now);
      const days = this.pendingDays;
      this.pendingDays = [];
      const ok = await cloud.pushShopFromRoom(room.ownerId, shop, room.code, days);
      if (!ok) {
        this.pendingDays = [...days, ...this.pendingDays];
        this.shopDirty = true;
      } else if (room.ownerId === uid) {
        // Mình là chủ tiệm: cloud đang đúng bản mình vừa ghi
        this.meta = { ownerUid: uid, cloudBase: now };
      }
      return;
    }
    if (!this.lastShop || !this.ownsShop()) return;
    const result = await cloud.pushShop(uid, { ...this.lastShop, ownerUid: uid, cloudBase: this.meta.cloudBase });
    if (result.ok) {
      this.meta = { ownerUid: uid, cloudBase: result.updatedAt };
      this.lastShop = { ...this.lastShop, ownerUid: uid, cloudBase: result.updatedAt };
      void this.repo.save(createSave(adapter.getState(), this.settings, { profile: this.profile, ledger: this.ledger, meta: this.meta }));
    } else if (result.reason === 'conflict') {
      // Máy khác vừa sửa tiệm trên cloud: lấy bản cloud về
      this.hooks.notify('shopConflict');
      await this.doSync(false);
    } else {
      this.shopDirty = true;
    }
  }

  /** Mở phòng ở tiệm của mình: ghi tiệm lên cloud kèm mã phòng để chủ phòng (có thể là bạn) được ghi tiếp. */
  async attachRoom(shop: ShopState, room: string): Promise<void> {
    const cloud = this.cloud;
    const uid = this.account?.uid;
    if (!cloud || !uid) return;
    const now = Date.now();
    if (await cloud.pushShopFromRoom(uid, shopSaveOf(shop, { ownerUid: uid, cloudBase: 0 }, now), room, [])) {
      this.meta = { ownerUid: uid, cloudBase: now };
    }
  }
}
