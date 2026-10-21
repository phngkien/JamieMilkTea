// Kết nối Firebase (đăng nhập ẩn danh) và tạo / vào phòng chơi chung.
// File này chỉ được tải khi người chơi bấm "Mời bạn" (chơi một mình không cần mạng).
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  get,
  getDatabase,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';
import { APRON_COLORS } from '../config/characters';
import { ROOM } from '../config/room';
import type { ShopState } from '../core/types';
import { firebaseConfig } from './firebaseConfig';
import { randomCode } from './roomCode';
import { encodeState } from './serialize';

export interface RoomSession {
  db: Database;
  uid: string;
  code: string;
  ownerUid: string;
}

export type JoinError = 'notFound' | 'full' | 'offline';

/** Khởi tạo Firebase và đăng nhập ẩn danh (một lần). */
export async function connect(): Promise<{ db: Database; uid: string }> {
  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const cred = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
  return { db: getDatabase(app), uid: cred.user.uid };
}

/** Xóa các phòng cũ (quá 24 giờ) do chính mình tạo — gói miễn phí không có máy chủ để tự dọn. */
async function cleanupOldRooms(db: Database, uid: string): Promise<void> {
  try {
    const snap = await get(ref(db, `userRooms/${uid}`));
    const rooms = (snap.val() ?? {}) as Record<string, number>;
    const now = Date.now();
    for (const [code, createdAt] of Object.entries(rooms)) {
      if (now - createdAt > ROOM.maxAgeMs) {
        await remove(ref(db, `rooms/${code}`)).catch(() => undefined);
        await remove(ref(db, `userRooms/${uid}/${code}`)).catch(() => undefined);
      }
    }
  } catch {
    // Dọn không được thì thôi, lần sau thử lại
  }
}

/** Mở tiệm cho bạn bè: tạo mã phòng mới, mình là chủ phòng + host. */
export async function createRoom(name: string, shop: ShopState): Promise<RoomSession> {
  const { db, uid } = await connect();
  await cleanupOldRooms(db, uid);
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const metaRef = ref(db, `rooms/${code}/meta`);
    // Transaction: chỉ tạo nếu mã chưa ai dùng
    const result = await runTransaction(metaRef, (current) => {
      if (current) return undefined;
      return { hostUid: uid, ownerUid: uid, createdAt: Date.now(), status: 'lobby', version: 1 };
    });
    if (!result.committed) continue;
    await set(ref(db, `rooms/${code}/players/${uid}`), {
      name,
      station: null,
      joinedAt: Date.now(),
      online: true,
      lastSeen: serverTimestamp(),
      color: APRON_COLORS[0],
    });
    await set(ref(db, `rooms/${code}/state`), { data: encodeState({ ...shop, solo: false }), seq: 0 });
    await set(ref(db, `userRooms/${uid}/${code}`), Date.now());
    return { db, uid, code, ownerUid: uid };
  }
  throw new Error('Không tạo được mã phòng, thử lại nhé');
}

/** Vào tiệm bạn bằng mã. */
export async function joinRoom(code: string, name: string): Promise<RoomSession | JoinError> {
  let conn: { db: Database; uid: string };
  try {
    conn = await connect();
  } catch {
    return 'offline';
  }
  const { db, uid } = conn;
  const metaSnap = await get(ref(db, `rooms/${code}/meta`)).catch(() => null);
  if (!metaSnap?.exists()) return 'notFound';
  const meta = metaSnap.val() as { ownerUid: string };
  const playerRef = ref(db, `rooms/${code}/players/${uid}`);
  try {
    // Đã từng ở phòng này (vào lại sau khi mất mạng) thì giữ nguyên thông tin cũ
    const existing = await get(playerRef).catch(() => null);
    if (existing?.exists()) {
      await update(playerRef, { name, online: true, lastSeen: serverTimestamp() });
    } else {
      // Luật bảo mật chặn khi phòng đã đủ 4 người
      await set(playerRef, {
        name,
        station: null,
        joinedAt: Date.now(),
        online: true,
        lastSeen: serverTimestamp(),
        color: APRON_COLORS[Math.floor(Math.random() * APRON_COLORS.length)],
      });
    }
  } catch {
    return 'full';
  }
  return { db, uid, code, ownerUid: meta.ownerUid };
}
