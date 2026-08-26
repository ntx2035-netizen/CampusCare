import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth';
import LoginPage from './LoginPage';

describe('Đăng nhập quản trị', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('gửi thông tin đăng nhập và lưu phiên', async () => {
    const payload = {
      access_token: 'access', refresh_token: 'refresh', expires_in: 900,
      user: { id: '1', email: 'dispatcher.test@gmail.com', full_name: 'Điều phối', role: 'DISPATCHER', account_type: 'DISPATCHER', email_verified: true, is_active: true, created_at: new Date().toISOString() },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Email'), 'dispatcher.test@gmail.com');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'CampusCare@Dispatch2026!');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/login'), expect.objectContaining({ method: 'POST' }));
    expect(localStorage.getItem('campuscare_auth')).toContain('access');
  });

  it('hiển thị lỗi từ API', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ detail: 'Email hoặc mật khẩu không đúng' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Email'), 'sai@ictu.edu.vn');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'SaiMatKhau@2026');
    await userEvent.click(screen.getByRole('button', { name: /đăng nhập/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email hoặc mật khẩu không đúng');
  });

  it('đăng ký sinh viên bằng email trường', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Đã gửi mã OTP' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<MemoryRouter><AuthProvider><LoginPage /></AuthProvider></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /chưa có tài khoản/i }));
    await userEvent.type(screen.getByLabelText('Họ và tên'), 'Sinh viên ICTU');
    await userEvent.clear(screen.getByLabelText('Email'));
    await userEvent.type(screen.getByLabelText('Email'), 'student@ictu.edu.vn');
    await userEvent.clear(screen.getByLabelText('Mật khẩu'));
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'MatKhauAnToan@2026');
    await userEvent.type(screen.getByLabelText('Xác nhận mật khẩu'), 'MatKhauAnToan@2026');
    await userEvent.click(screen.getByRole('button', { name: /gửi mã otp/i }));
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/register/request-otp'), expect.objectContaining({ method: 'POST' }));
    expect(await screen.findByLabelText('Mã OTP')).toBeInTheDocument();
  });
});
