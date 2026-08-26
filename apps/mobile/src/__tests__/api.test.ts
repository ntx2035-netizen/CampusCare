import { afterEach, describe, expect, it, vi } from 'vitest';

const values = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: vi.fn(async (key: string) => values.get(key) || null), setItem: vi.fn(async (key: string, value: string) => values.set(key, value)), removeItem: vi.fn(async (key: string) => values.delete(key)) } }));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

import { api, saveSession } from '../api';

describe('Lớp API mobile', () => {
  afterEach(() => { values.clear(); vi.restoreAllMocks(); });
  it('gắn access token vào yêu cầu', async () => {
    await saveSession({ access_token: 'token-demo', refresh_token: 'refresh', expires_in: 900, user: { id: '1', email: 'student@test', full_name: 'Sinh viên', role: 'STUDENT', account_type: 'STUDENT', email_verified: true, is_active: true } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await api('/auth/me'); const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-demo');
  });
  it('trả thông điệp lỗi từ backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: 'Không có quyền' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(api('/users')).rejects.toThrow('Không có quyền');
  });
  it('dịch lỗi validation thành thông báo cụ thể', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ['body', 'password'], msg: 'String should have at least 12 characters', ctx: { min_length: 12 } }] }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
    await expect(api('/auth/register/request-otp', { method: 'POST', body: '{}' })).rejects.toThrow('Mật khẩu phải có tối thiểu 12 ký tự');
  });
});
