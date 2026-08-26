import { Activity, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import type { AccountType } from '../types';

export default function LoginPage() {
  const { login, requestRegistration, verifyRegistration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('STUDENT');
  const [otp, setOtp] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) throw new Error('Mật khẩu xác nhận không khớp');
        await requestRegistration(fullName, email, password, accountType);
        setMode('otp'); setSuccess('Đã gửi mã OTP đến địa chỉ email của bạn.');
      } else if (mode === 'otp') {
        const result = await verifyRegistration(email, otp);
        if (result.session) navigate((location.state as { from?: string } | null)?.from || '/', { replace: true });
        else { setSuccess(result.message); setMode('login'); }
      } else {
        await login(email, password);
        navigate((location.state as { from?: string } | null)?.from || '/', { replace: true });
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng nhập không thành công'); }
    finally { setLoading(false); }
  }

  return <div className="login-page">
    <section className="login-visual">
      <div className="login-brand"><span className="brand-mark"><Activity /></span> CampusCare</div>
      <div><span className="eyebrow">KHUÔN VIÊN AN TOÀN • PHẢN HỒI TỨC THỜI</span><h1>Mọi sự cố đều được<br />quan tâm đúng lúc.</h1><p>Tiếp nhận, điều phối và theo dõi xử lý trong một nền tảng thống nhất.</p></div>
      <div className="visual-stats"><span><strong>Realtime</strong>Cập nhật tức thời</span><span><strong>24/7</strong>Sẵn sàng tiếp nhận</span></div>
    </section>
    <section className="login-panel"><form onSubmit={submit}>
      <div className="mobile-logo"><Activity /> CampusCare</div>
      <span className="eyebrow">CỔNG CAMPUSCARE ICTU</span><h2>{mode === 'login' ? 'Chào mừng trở lại' : mode === 'otp' ? 'Xác minh email' : 'Tạo tài khoản'}</h2><p>{mode === 'login' ? 'Một cổng đăng nhập cho mọi vai trò.' : mode === 'otp' ? 'Nhập mã OTP gồm 6 chữ số đã gửi tới email.' : 'Sinh viên/giảng viên dùng email ICTU; kỹ thuật viên và điều phối dùng Gmail rồi chờ admin duyệt.'}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="notice success">{success}</div>}
      {mode === 'register' && <label>Loại tài khoản<select aria-label="Loại tài khoản" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}><option value="STUDENT">Sinh viên ICTU</option><option value="LECTURER">Giảng viên ICTU</option><option value="STAFF">Kỹ thuật viên</option><option value="DISPATCHER">Điều phối viên</option></select></label>}
      {mode === 'register' && <label>Họ và tên<div className="input-with-icon"><UserRound size={18} /><input aria-label="Họ và tên" value={fullName} onChange={(e) => setFullName(e.target.value)} minLength={2} required /></div></label>}
      <label>Email<div className="input-with-icon"><Mail size={18} /><input aria-label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></label>
      {mode !== 'otp' && <label>Mật khẩu{mode === 'register' && <small> (tối thiểu 12 ký tự)</small>}<div className="input-with-icon"><LockKeyhole size={18} /><input aria-label="Mật khẩu" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 12 : 8} required /></div></label>}
      {mode === 'register' && <label>Xác nhận mật khẩu<div className="input-with-icon"><LockKeyhole size={18} /><input aria-label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={12} required /></div></label>}
      {mode === 'otp' && <label>Mã OTP<input aria-label="Mã OTP" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required /></label>}
      <button className="primary wide" disabled={loading}>{loading ? 'Đang xử lý…' : <>{mode === 'login' ? 'Đăng nhập' : mode === 'otp' ? 'Xác minh OTP' : 'Gửi mã OTP'} <ArrowRight size={18} /></>}</button>
      <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}>{mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Quay lại đăng nhập'}</button>
      <small className="security-note">Kết nối được bảo vệ. Không chia sẻ thông tin đăng nhập.</small>
    </form></section>
  </div>;
}
