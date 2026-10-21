// Mã phòng 6 ký tự: bỏ O/0, I/1 dễ nhầm (CLAUDE.md mục 11).
import { ROOM } from '../config/room';

export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length = ROOM.codeLength, random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return out;
}

/** Chuẩn hóa mã người chơi gõ vào: viết hoa, bỏ khoảng trắng và dấu gạch. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM.codeLength);
}

export function isValidCode(code: string): boolean {
  return code.length === ROOM.codeLength && [...code].every((c) => CODE_CHARS.includes(c));
}

/** Link mời: ...#join-ABC234 */
export function inviteLink(code: string, base = window.location.href): string {
  return `${base.split('#')[0]}#join-${code}`;
}

/** Đọc mã phòng từ link (#join-ABC234). */
export function codeFromHash(hash: string): string | null {
  const m = /^#join-([A-Za-z0-9]+)$/.exec(hash);
  if (!m) return null;
  const code = normalizeCode(m[1]);
  return isValidCode(code) ? code : null;
}
