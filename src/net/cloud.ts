// Lưu lâu dài trên Firebase: tiệm (/shops/{uid chủ tiệm}) và hồ sơ cá nhân (/profiles/{uid}).
// Kèm tài khoản: liên kết Google, mã tài khoản để đăng nhập trên máy khác.
// File này chỉ được tải bằng import động, sau khi game đã mở (không mạng vẫn chơi được).
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { get, ref, runTransaction, set, update } from 'firebase/database';
import type { DaySummary, Profile } from '../core/types';
import type { ShopSave } from '../save/schema';
import { historyKey, profileFromCloud, profileToCloud, shopFromCloud, shopToCloud } from '../save/sync';
import { auth, connect, db } from './firebase';
import { isValidLoginCode, loginCredentials, makeLoginCode } from './loginCode';

export interface AccountInfo {
  uid: string;
  /** Tài khoản khách (chưa liên kết gì): mất nếu xóa dữ liệu trình duyệt. */
  anonymous: boolean;
  googleEmail: string | null;
  /** Đã tạo mã tài khoản. */
  hasCode: boolean;
}

function infoOf(user: User): AccountInfo {
  const google = user.providerData.find((p) => p.providerId === 'google.com');
  return {
    uid: user.uid,
    anonymous: user.isAnonymous,
    googleEmail: google?.email ?? null,
    hasCode: user.providerData.some((p) => p.providerId === 'password'),
  };
}

/** Đăng nhập (khách nếu chưa có tài khoản). null = không có mạng / Firebase lỗi. */
export async function startCloud(): Promise<AccountInfo | null> {
  try {
    await connect();
    const user = auth().currentUser;
    return user ? infoOf(user) : null;
  } catch {
    return null;
  }
}

export function accountInfo(): AccountInfo | null {
  const user = auth().currentUser;
  return user ? infoOf(user) : null;
}

/** Nghe khi tài khoản đổi (đăng nhập bằng mã / Google trên máy mới). */
export function onAccountChange(listener: (info: AccountInfo | null) => void): () => void {
  return onAuthStateChanged(auth(), (user) => listener(user ? infoOf(user) : null));
}

// ───────────── Tiệm ─────────────

export async function fetchShop(uid: string): Promise<ShopSave | null> {
  const snap = await get(ref(db(), `shops/${uid}`));
  return snap.exists() ? shopFromCloud(snap.val()) : null;
}

/**
 * Đẩy tiệm lên cloud (chơi một mình). Chỉ ghi nếu cloud vẫn đúng bản đã đồng bộ lần trước
 * (`shop.cloudBase`); nếu máy khác đã sửa cloud thì trả 'conflict' để lấy bản cloud về.
 * Trả về `updatedAt` của bản đã ghi khi thành công.
 */
export async function pushShop(uid: string, shop: ShopSave): Promise<{ ok: true; updatedAt: number } | { ok: false; reason: 'conflict' | 'error' }> {
  try {
    const result = await runTransaction(
      ref(db(), `shops/${uid}`),
      (current: Record<string, unknown> | null) => {
        if (current && current.updatedAt !== shop.cloudBase) return undefined; // có người khác sửa → hủy
        return shopToCloud({ ...shop, ownerUid: uid }, null);
      },
      { applyLocally: false },
    );
    return result.committed ? { ok: true, updatedAt: shop.updatedAt } : { ok: false, reason: 'conflict' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Chủ phòng ghi tiệm của chủ tiệm khi đang chơi chung. Ghi từng phần (không ghi đè lịch sử cũ),
 * chỉ thêm các ngày vừa kết thúc trong phòng. Luật bảo mật kiểm tra người ghi là host của phòng `room`.
 */
export async function pushShopFromRoom(ownerUid: string, shop: ShopSave, room: string, newDays: DaySummary[]): Promise<boolean> {
  const { history: _h, ...fields } = shopToCloud({ ...shop, ownerUid }, room);
  void _h;
  const changes: Record<string, unknown> = { ...fields };
  for (const d of newDays) changes[`history/${historyKey(d.day)}`] = JSON.parse(JSON.stringify(d));
  try {
    await update(ref(db(), `shops/${ownerUid}`), changes);
    return true;
  } catch {
    return false;
  }
}

/** "Chơi lại từ đầu": ghi đè tiệm trên cloud bằng tiệm mới (ngày 1). */
export async function resetShop(uid: string, shop: ShopSave): Promise<boolean> {
  try {
    await set(ref(db(), `shops/${uid}`), shopToCloud({ ...shop, ownerUid: uid }, null));
    return true;
  } catch {
    return false;
  }
}

/** Gắn tiệm với phòng vừa mở (để host của phòng được ghi tiệm). */
export async function attachShopToRoom(ownerUid: string, room: string | null): Promise<void> {
  await update(ref(db(), `shops/${ownerUid}`), { room }).catch(() => undefined);
}

// ───────────── Hồ sơ cá nhân ─────────────

export async function fetchProfile(uid: string): Promise<{ profile: Profile | null; loginCode: string | null }> {
  const snap = await get(ref(db(), `profiles/${uid}`));
  const raw = snap.val() as Record<string, unknown> | null;
  return {
    profile: profileFromCloud(raw),
    loginCode: typeof raw?.loginCode === 'string' ? raw.loginCode : null,
  };
}

export async function pushProfile(profile: Profile): Promise<boolean> {
  const uid = auth().currentUser?.uid;
  if (!uid) return false;
  try {
    // update (không phải set) để giữ lại mã tài khoản đã lưu trong profile
    await update(ref(db(), `profiles/${uid}`), profileToCloud({ ...profile, uid }));
    return true;
  } catch {
    return false;
  }
}

// ───────────── Tài khoản ─────────────

export type LinkError = 'popupBlocked' | 'cancelled' | 'network' | 'unsupported' | 'notEnabled' | 'other';
export type LinkResult =
  | { ok: true; info: AccountInfo }
  | { ok: false; conflict: AuthCredential }
  | { ok: false; error: LinkError };

function linkError(err: unknown): LinkError {
  const code = (err as { code?: string }).code ?? '';
  if (code === 'auth/popup-blocked') return 'popupBlocked';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || code === 'auth/user-cancelled') return 'cancelled';
  if (code === 'auth/network-request-failed') return 'network';
  if (code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/web-storage-unsupported') return 'unsupported';
  // Chưa bật Google / Email-Mật khẩu trong Firebase Console
  if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') return 'notEnabled';
  return 'other';
}

/**
 * "Giữ tài khoản" bằng Google: gắn Google vào tài khoản hiện tại (giữ nguyên tiệm và profile).
 * Nếu Google đó đã là tài khoản khác (đã giữ trên máy khác) thì trả `conflict` để hỏi người chơi
 * có chuyển sang tài khoản đó không.
 * Phải gọi NGAY khi người chơi bấm nút (Safari chặn popup mở trễ).
 */
export async function linkGoogle(): Promise<LinkResult> {
  const user = auth().currentUser;
  if (!user) return { ok: false, error: 'network' };
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await linkWithPopup(user, provider);
    return { ok: true, info: infoOf(result.user) };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/provider-already-linked') return { ok: true, info: infoOf(user) };
    if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
      const credential = GoogleAuthProvider.credentialFromError(err as never);
      if (credential) return { ok: false, conflict: credential };
    }
    return { ok: false, error: linkError(err) };
  }
}

/** Chuyển sang tài khoản Google đã có (sau khi người chơi đồng ý). */
export async function switchToCredential(credential: AuthCredential): Promise<AccountInfo | null> {
  try {
    const result = await signInWithCredential(auth(), credential);
    return infoOf(result.user);
  } catch {
    return null;
  }
}

/**
 * Tạo mã tài khoản: gắn một cặp email/mật khẩu sinh từ mã vào tài khoản hiện tại.
 * Mã được lưu trong profile (chỉ chính mình đọc được) để xem lại trên máy khác.
 */
export async function createLoginCode(): Promise<{ ok: true; code: string } | { ok: false; error: LinkError }> {
  const user = auth().currentUser;
  if (!user) return { ok: false, error: 'network' };
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = makeLoginCode();
    const { email, password } = loginCredentials(code);
    try {
      await linkWithCredential(user, EmailAuthProvider.credential(email, password));
      await update(ref(db(), `profiles/${user.uid}`), { loginCode: code }).catch(() => undefined);
      return { ok: true, code };
    } catch (err) {
      const errCode = (err as { code?: string }).code;
      // Trùng mã (rất hiếm) thì thử mã khác
      if (errCode === 'auth/email-already-in-use' || errCode === 'auth/credential-already-in-use') continue;
      return { ok: false, error: linkError(err) };
    }
  }
  return { ok: false, error: 'other' };
}

/** Đăng nhập bằng mã tài khoản (trên máy mới). */
export async function signInWithCode(code: string): Promise<{ ok: true; info: AccountInfo } | { ok: false; error: 'badCode' | LinkError }> {
  if (!isValidLoginCode(code)) return { ok: false, error: 'badCode' };
  const { email, password } = loginCredentials(code);
  try {
    const result = await signInWithEmailAndPassword(auth(), email, password);
    return { ok: true, info: infoOf(result.user) };
  } catch (err) {
    const errCode = (err as { code?: string }).code ?? '';
    if (errCode === 'auth/invalid-credential' || errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password' || errCode === 'auth/invalid-email') {
      return { ok: false, error: 'badCode' };
    }
    return { ok: false, error: linkError(err) };
  }
}
