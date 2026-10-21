// Kết nối Firebase (đăng nhập ẩn danh) và tạo / vào phòng chơi chung.
// File này chỉ được tải khi người chơi bấm "Mời bạn" (chơi một mình không cần mạng).
import {
  get,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';
import { ROOM } from '../config/room';
import type { ShopState } from '../core/types';
import { connect } from './firebase';
import { randomCode } from './roomCode';
import { encodeState } from './serialize';

export interface RoomSession {
  db: Database;
  uid: string;
  code: string;
  ownerUid: string;
}

export type JoinError = 'notFound' | 'full' | 'offline';

/**
 * Giành một trong 4 "ghế" của phòng (rooms/{mã}/slots/1..4). Luật bảo mật chỉ cho người có ghế
 * ghi thông tin người chơi — nhờ vậy phòng tối đa 4 người. Đã có ghế từ trước (vào lại) thì giữ ghế đó.
 */
export async function claimSeat(db: Database, code: string, uid: string): Promise<boolean> {
  const snap = await get(ref(db, `rooms/${code}/slots`)).catch(() => null);
  const seats = (snap?.val() ?? {}) as Record<string, string>;
  if (Object.values(seats).includes(uid)) return true;
  for (let n = 1; n <= ROOM.maxPlayers; n++) {
    if (seats[n]) continue;
    // Transaction: hai người cùng giành một ghế thì chỉ một người được
    const result = await runTransaction(ref(db, `rooms/${code}/slots/${n}`), (current) => (current ? undefined : uid)).catch(
      () => null,
    );
    if (result?.committed) return true;
  }
  return false;
}

/** Trả ghế khi rời phòng. */
export async function releaseSeat(db: Database, code: string, uid: string): Promise<void> {
  const snap = await get(ref(db, `rooms/${code}/slots`)).catch(() => null);
  const seats = (snap?.val() ?? {}) as Record<string, string>;
  for (const [n, owner] of Object.entries(seats)) {
    if (owner === uid) await remove(ref(db, `rooms/${code}/slots/${n}`)).catch(() => undefined);
  }
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
export async function createRoom(name: string, outfit: string, shop: ShopState): Promise<RoomSession> {
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
    await claimSeat(db, code, uid);
    await set(ref(db, `rooms/${code}/players/${uid}`), {
      name,
      station: null,
      joinedAt: Date.now(),
      online: true,
      lastSeen: serverTimestamp(),
      outfit,
    });
    await set(ref(db, `rooms/${code}/state`), { data: encodeState({ ...shop, solo: false }), seq: 0 });
    await set(ref(db, `userRooms/${uid}/${code}`), Date.now());
    return { db, uid, code, ownerUid: uid };
  }
  throw new Error('Không tạo được mã phòng, thử lại nhé');
}

/** Vào tiệm bạn bằng mã. */
export async function joinRoom(code: string, name: string, outfit: string): Promise<RoomSession | JoinError> {
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
  // Hết ghế (đủ 4 người) thì không vào được
  if (!(await claimSeat(db, code, uid))) return 'full';
  const playerRef = ref(db, `rooms/${code}/players/${uid}`);
  try {
    // Đã từng ở phòng này (vào lại sau khi mất mạng) thì giữ nguyên thông tin cũ
    const existing = await get(playerRef).catch(() => null);
    if (existing?.exists()) {
      await update(playerRef, { name, outfit, online: true, lastSeen: serverTimestamp() });
    } else {
      await set(playerRef, {
        name,
        station: null,
        joinedAt: Date.now(),
        online: true,
        lastSeen: serverTimestamp(),
        outfit,
      });
    }
  } catch {
    return 'full';
  }
  return { db, uid, code, ownerUid: meta.ownerUid };
}
