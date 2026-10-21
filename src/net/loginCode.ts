// Mã tài khoản: 8 ký tự dễ đọc (bỏ O/0, I/1), hiện dạng ABCD-2345.
// Nhập mã này trên máy khác là đăng nhập đúng tài khoản (cùng tiệm, cùng outfit).
import { CLOUD } from '../config/cloud';
import { CODE_CHARS } from './roomCode';

export function makeLoginCode(random: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < CLOUD.loginCodeLength; i++) out += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return out;
}

/** Chuẩn hóa mã gõ vào: viết hoa, bỏ dấu gạch và khoảng trắng. */
export function normalizeLoginCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CLOUD.loginCodeLength);
}

export function isValidLoginCode(code: string): boolean {
  return code.length === CLOUD.loginCodeLength && [...code].every((c) => CODE_CHARS.includes(c));
}

/** ABCD2345 → ABCD-2345 (dễ đọc, dễ chép). */
export function formatLoginCode(code: string): string {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)}-${code.slice(half)}`;
}

/** Email và mật khẩu Firebase tương ứng với mã. */
export function loginCredentials(code: string): { email: string; password: string } {
  return { email: `${code.toLowerCase()}@${CLOUD.loginEmailDomain}`, password: `jmt-${code}` };
}
