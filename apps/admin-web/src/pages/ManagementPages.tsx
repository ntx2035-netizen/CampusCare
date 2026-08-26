import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, download } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Audit, Category, Location, Notification, Role, Summary, User } from '../types';
import { ACCOUNT_TYPE_LABEL, ROLE_LABEL } from '../types';

function Result({ message }: { message: string }) { return message ? <div className={message.startsWith('Đã') ? 'notice success' : 'notice error'}>{message}</div> : null; }

export function UsersPage() {
  const { user } = useAuth(); const client = useQueryClient(); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('/users') });
  const mutation = useMutation({ mutationFn: (body: object) => api<User>('/users', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => { setMessage('Đã tạo tài khoản.'); client.invalidateQueries({ queryKey: ['users'] }); }, onError: (e: Error) => setMessage(e.message) });
  const approve = useMutation({ mutationFn: (id: string) => api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) }), onSuccess: () => { setMessage('Đã duyệt tài khoản nghiệp vụ.'); client.invalidateQueries({ queryKey: ['users'] }); }, onError: (e: Error) => setMessage(e.message) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); const accountType = String(values.account_type); values.role = accountType === 'LECTURER' ? 'STUDENT' : accountType; mutation.mutate(values); event.currentTarget.reset(); }
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Quản lý người dùng" subtitle="Tài khoản, vai trò và trạng thái truy cập hệ thống." /> <Result message={message} />
    {user?.role === 'ADMIN' && <details className="card create-panel"><summary><Plus size={17} /> Tạo tài khoản</summary><form className="form-grid" onSubmit={submit}><label>Họ tên<input name="full_name" required minLength={2} /></label><label>Email<input name="email" type="email" required /></label><label>Loại tài khoản<select name="account_type"><option value="STUDENT">Sinh viên ICTU</option><option value="LECTURER">Giảng viên ICTU</option><option value="STAFF">Nhân viên sửa chữa</option><option value="DISPATCHER">Điều phối viên</option></select></label><label>Mật khẩu ban đầu<input name="password" type="password" minLength={12} required /></label><button className="primary"><Plus size={17} /> Tạo tài khoản</button></form></details>}
    <section className="card">{!query.data?.length ? <Empty /> : <div className="table-wrap"><table><thead><tr><th>Người dùng</th><th>Loại tài khoản</th><th>Vai trò hệ thống</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>{query.data.map((item) => { const pending = !item.is_active && ['DISPATCHER', 'STAFF'].includes(item.account_type) && !item.approved_at; return <tr key={item.id}><td><strong>{item.full_name}</strong><small>{item.email}</small></td><td>{ACCOUNT_TYPE_LABEL[item.account_type]}</td><td>{ROLE_LABEL[item.role]}</td><td><StatusBadge status={item.is_active ? 'Hoạt động' : pending ? 'Chờ duyệt' : 'Đã khóa'} /></td><td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td><td>{user?.role === 'ADMIN' && pending ? <button className="small-button" onClick={() => approve.mutate(item.id)} disabled={approve.isPending}>Duyệt tài khoản</button> : '—'}</td></tr>; })}</tbody></table></div>}</section>
  </>;
}

export function LocationsPage() {
  const client = useQueryClient(); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['locations'], queryFn: () => api<Location[]>('/locations?include_inactive=true') });
  const mutation = useMutation({ mutationFn: (body: object) => api<Location>('/locations', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => { setMessage('Đã tạo địa điểm.'); client.invalidateQueries({ queryKey: ['locations'] }); }, onError: (e: Error) => setMessage(e.message) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body: Record<string, any> = Object.fromEntries(form); if (!body.parent_id) delete body.parent_id; if (body.latitude) body.latitude = Number(body.latitude); else delete body.latitude; if (body.longitude) body.longitude = Number(body.longitude); else delete body.longitude; mutation.mutate(body); }
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Quản lý địa điểm" subtitle="Cấu trúc khu vực, tòa nhà, tầng, phòng và mã QR định danh." /> <Result message={message} />
    <details className="card create-panel"><summary><Plus size={17} /> Thêm địa điểm</summary><form className="form-grid" onSubmit={submit}><label>Tên<input name="name" required /></label><label>Mã<input name="code" pattern="[A-Za-z0-9._-]+" required /></label><label>Loại<select name="kind"><option value="AREA">Khu vực</option><option value="BUILDING">Tòa nhà</option><option value="FLOOR">Tầng</option><option value="ROOM">Phòng</option></select></label><label>Địa điểm cha<select name="parent_id"><option value="">Không có</option>{query.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Latitude<input name="latitude" type="number" step="any" /></label><label>Longitude<input name="longitude" type="number" step="any" /></label><button className="primary"><Plus size={17} /> Thêm</button></form></details>
    <section className="card"><div className="table-wrap"><table><thead><tr><th>Mã</th><th>Tên</th><th>Loại</th><th>Tọa độ</th><th>Trạng thái</th><th>QR</th></tr></thead><tbody>{query.data?.map((item) => <tr key={item.id}><td className="code">{item.code}</td><td>{item.name}</td><td>{item.kind}</td><td>{item.latitude ? `${item.latitude}, ${item.longitude}` : '—'}</td><td>{item.is_active ? 'Hoạt động' : 'Đã khóa'}</td><td><button className="small-button" type="button" onClick={async () => { const blob = await download(`/locations/${item.id}/qr`); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${item.code}.png`; a.click(); URL.revokeObjectURL(url); }}><Download size={15} /> Tải QR</button></td></tr>)}</tbody></table></div></section>
  </>;
}

export function CategoriesPage() {
  const client = useQueryClient(); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories?include_inactive=true') });
  const mutation = useMutation({ mutationFn: (body: object) => api<Category>('/categories', { method: 'POST', body: JSON.stringify(body) }), onSuccess: () => { setMessage('Đã tạo loại sự cố.'); client.invalidateQueries({ queryKey: ['categories'] }); }, onError: (e: Error) => setMessage(e.message) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ name: form.get('name'), description: form.get('description'), sla_minutes: Number(form.get('sla_minutes')) }); }
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Loại sự cố" subtitle="Danh mục nghiệp vụ và thời gian cam kết xử lý (SLA)." /><Result message={message} /><details className="card create-panel"><summary><Plus size={17} /> Thêm loại sự cố</summary><form className="form-grid" onSubmit={submit}><label>Tên<input name="name" required /></label><label>Mô tả<input name="description" /></label><label>SLA (phút)<input name="sla_minutes" type="number" min="15" defaultValue="1440" required /></label><button className="primary"><Plus size={17} /> Thêm</button></form></details><section className="card"><div className="table-wrap"><table><thead><tr><th>Tên</th><th>Mô tả</th><th>SLA</th><th>Trạng thái</th></tr></thead><tbody>{query.data?.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.description || '—'}</td><td>{item.sla_minutes} phút</td><td>{item.is_active ? 'Hoạt động' : 'Đã khóa'}</td></tr>)}</tbody></table></div></section></>;
}

export function ReportsPage() {
  const query = useQuery({ queryKey: ['summary'], queryFn: () => api<Summary>('/reports/summary') });
  async function exportCsv() { const blob = await download('/reports/incidents.csv'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'bao-cao-su-co.csv'; a.click(); URL.revokeObjectURL(url); }
  if (query.isLoading) return <Loading />; if (query.error || !query.data) return <ErrorState error={query.error || new Error('Không có dữ liệu')} />; const data = query.data;
  return <><PageHeader title="Thống kê và báo cáo" subtitle="Chỉ số vận hành và tuân thủ thời gian xử lý." action={<button className="primary" onClick={exportCsv}><Download size={17} /> Xuất CSV</button>} /><div className="metrics"><article><div><small>Tổng sự cố</small><strong>{data.total}</strong></div></article><article><div><small>Thời gian xử lý TB</small><strong>{data.average_resolution_hours}h</strong></div></article><article><div><small>Đúng hạn SLA</small><strong>{data.on_time_rate}%</strong></div></article></div><div className="dashboard-grid"><section className="card"><h2>Theo trạng thái</h2>{Object.entries(data.by_status).map(([key, value]) => <div className="stat-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}</section><section className="card"><h2>Theo loại sự cố</h2>{Object.entries(data.by_category).map(([key, value]) => <div className="stat-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}</section></div></>;
}

export function AuditPage() {
  const query = useQuery({ queryKey: ['audit'], queryFn: () => api<Audit[]>('/audit-logs') });
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Nhật ký kiểm toán" subtitle="Dấu vết các hành động quan trọng trong hệ thống." /><section className="card">{!query.data?.length ? <Empty /> : <div className="table-wrap"><table><thead><tr><th>Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>Actor</th><th>IP</th></tr></thead><tbody>{query.data.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('vi-VN')}</td><td className="code">{item.action}</td><td>{item.entity_type} · {item.entity_id || '—'}</td><td>{item.actor_id || 'Hệ thống'}</td><td>{item.ip_address || '—'}</td></tr>)}</tbody></table></div>}</section></>;
}

export function NotificationsPage() {
  const client = useQueryClient(); const query = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('/notifications') });
  const read = useMutation({ mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  if (query.isLoading) return <Loading />; if (query.error) return <ErrorState error={query.error} />;
  return <><PageHeader title="Thông báo" subtitle="Cập nhật nhiệm vụ và tiến độ sự cố theo thời gian thực." /><section className="card notification-list">{!query.data?.length ? <Empty label="Bạn chưa có thông báo" /> : query.data.map((item) => <button key={item.id} className={item.is_read ? 'read' : ''} onClick={() => !item.is_read && read.mutate(item.id)}><span className="notification-dot" /><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.created_at).toLocaleString('vi-VN')}</small>{typeof item.data.incident_id === 'string' && <Link to={`/incidents/${item.data.incident_id}`}>Mở sự cố</Link>}</div></button>)}</section></>;
}

export function ProfilePage() {
  const { user, setUser } = useAuth(); const [message, setMessage] = useState('');
  const mutation = useMutation({ mutationFn: (body: object) => api<User>('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }), onSuccess: (next) => { setUser(next); setMessage('Đã cập nhật hồ sơ.'); }, onError: (e: Error) => setMessage(e.message) });
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate(Object.fromEntries(form)); }
  return <><PageHeader title="Hồ sơ cá nhân" subtitle="Cập nhật thông tin liên hệ của bạn." /><Result message={message} /><section className="card profile-card"><div className="profile-avatar">{user?.full_name.slice(0, 1)}</div><div><strong>{user?.email}</strong><p>{user && ROLE_LABEL[user.role as Role]}</p></div><form className="form-grid" onSubmit={submit}><label>Họ và tên<input name="full_name" defaultValue={user?.full_name} required /></label><label>Số điện thoại<input name="phone" defaultValue={user?.phone || ''} /></label><button className="primary"><Save size={17} /> Lưu thay đổi</button></form></section></>;
}
