import { describe, expect, it } from 'vitest';
import { formatLoginCode, isValidLoginCode, loginCredentials, makeLoginCode, normalizeLoginCode } from '../src/net/loginCode';

describe('mã tài khoản', () => {
  it('8 ký tự, không có ký tự dễ nhầm O/0, I/1', () => {
    for (let i = 0; i < 50; i++) {
      const code = makeLoginCode();
      expect(code).toHaveLength(8);
      expect(code).not.toMatch(/[O0I1]/);
      expect(isValidLoginCode(code)).toBe(true);
    }
  });

  it('hiện dạng ABCD-2345; gõ lại có gạch, khoảng trắng, chữ thường vẫn nhận', () => {
    expect(formatLoginCode('ABCD2345')).toBe('ABCD-2345');
    expect(normalizeLoginCode(' abcd-2345 ')).toBe('ABCD2345');
    expect(isValidLoginCode('ABCD234')).toBe(false);
    expect(isValidLoginCode('ABCD234O')).toBe(false);
  });

  it('cùng một mã luôn ra cùng email / mật khẩu', () => {
    expect(loginCredentials('ABCD2345')).toEqual(loginCredentials('ABCD2345'));
    expect(loginCredentials('ABCD2345').email).toBe('abcd2345@jamie.example.com');
    expect(loginCredentials('ABCD2345').password.length).toBeGreaterThanOrEqual(6);
  });
});
