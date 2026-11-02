import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, Check, MapPin, Star, UserCheck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, download } from '../api';
import { useAuth } from '../auth';
import { ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Incident, IncidentImage, IncidentStatus, User } from '../types';
import { STATUS_LABEL } from '../types';

function AuthImage({ incidentId, image }: { incidentId: string; image: IncidentImage }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true; let url = '';
    download(`/incidents/${incidentId}/images/${image.id}`).then((blob) => {
      url = URL.createObjectURL(blob); if (active) setSrc(url);
    }).catch(() => undefined);
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [image.id, incidentId]);
  return src ? <img src={src} alt={`Ảnh ${image.kind.toLowerCase()}`} /> : <div className="image-placeholder">Đang tải ảnh…</div>;
}

export default function IncidentDetailPage() {
  const { id = '' } = useParams(); const { user } = useAuth(); const client = useQueryClient();
  const [notice, setNotice] = useState('');
  const [staffId, setStaffId] = useState('');
  const query = useQuery({ queryKey: ['incidents', id], queryFn: () => api<Incident>(`/incidents/${id}`) });
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api<User[]>('/users?role=STAFF&active=true'), enabled: user?.role === 'ADMIN' || user?.role === 'DISPATCHER' });
  const mutation = useMutation({ mutationFn: ({ path, body, method = 'PATCH' }: { path: string; body: object; method?: string }) => api<Incident>(path, { method, body: JSON.stringify(body) }), onSuccess: () => { client.invalidateQueries({ queryKey: ['incidents'] }); setNotice('Cập nhật thành công.'); }, onError: (error: Error) => setNotice(error.message) });
  const upload = useMutation({ mutationFn: (body: FormData) => api(`/incidents/${id}/images`, { method: 'POST', body }), onSuccess: () => { query.refetch(); setNotice('Đã tải ảnh lên.'); }, onError: (error: Error) => setNotice(error.message) });
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <ErrorState error={query.error || new Error('Không tìm thấy sự cố')} retry={() => query.refetch()} />;
  const incident = query.data;

  function status(target: IncidentStatus, note?: string, resolution?: string) {
    mutation.mutate({ path: `/incidents/${id}/status`, body: { status: target, note, resolution } });
  }
  function requestText(target: IncidentStatus, label: string, resolution = false) {
    const value = window.prompt(label);
    if (value) status(target, resolution ? undefined : value, resolution ? value : undefined);
  }
  function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); upload.mutate(form);
  }

  return <><Link to="/incidents" className="back"><ArrowLeft size={17} /> Quay lại danh sách</Link>
    <PageHeader title={incident.code} subtitle={incident.title} action={<StatusBadge status={STATUS_LABEL[incident.status]} />} />
    {notice && <div className={notice.includes('thành công') || notice.startsWith('Đã') ? 'notice success' : 'notice error'}>{notice}<button onClick={() => setNotice('')}><X size={16} /></button></div>}
    <div className="detail-grid"><div className="detail-main">
      <section className="card incident-summary"><div className="card-title"><h2>Thông tin sự cố</h2><span className={`priority priority-${incident.priority.toLowerCase()}`}>{incident.priority}</span></div><p>{incident.description}</p><dl><div><dt>Loại sự cố</dt><dd>{incident.category.name}</dd></div><div><dt>Người báo</dt><dd>{incident.reporter.full_name}</dd></div><div><dt>Phòng/khu vực</dt><dd><MapPin size={15} /> {incident.location?.name || incident.location_note || 'Chưa có địa điểm'}</dd></div>{incident.location_note && <div><dt>Vị trí chi tiết</dt><dd>{incident.location_note}</dd></div>}<div><dt>GPS người báo</dt><dd>{incident.latitude != null && incident.longitude != null ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`} target="_blank" rel="noreferrer">{incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)} · Mở chỉ đường</a> : 'Không có tọa độ'}</dd></div><div><dt>Hạn SLA</dt><dd>{incident.due_at ? new Date(incident.due_at).toLocaleString('vi-VN') : '—'}</dd></div><div><dt>Nhân viên xử lý</dt><dd>{incident.assigned_staff?.full_name || 'Chưa phân công'}</dd></div><div><dt>Ngày tạo</dt><dd>{new Date(incident.created_at).toLocaleString('vi-VN')}</dd></div></dl>{incident.resolution && <div className="resolution"><strong>Nội dung giải quyết</strong><p>{incident.resolution}</p></div>}</section>
      <section className="card"><div className="card-title"><h2>Hình ảnh</h2></div>{incident.images.length ? <div className="image-grid">{incident.images.map((image) => <figure key={image.id}><AuthImage incidentId={incident.id} image={image} /><figcaption>{image.kind === 'REPORT' ? 'Ảnh báo cáo' : image.kind === 'BEFORE' ? 'Trước xử lý' : 'Sau xử lý'}</figcaption></figure>)}</div> : <p className="muted">Chưa có hình ảnh.</p>}
        <form className="upload-form" onSubmit={submitUpload}><select name="kind" aria-label="Loại ảnh" defaultValue={user?.role === 'STAFF' ? 'BEFORE' : 'REPORT'}>{user?.role !== 'STAFF' && <option value="REPORT">Ảnh báo cáo</option>} {user?.role !== 'STUDENT' && <><option value="BEFORE">Trước xử lý</option><option value="AFTER">Sau xử lý</option></>}</select><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><button disabled={upload.isPending}><Camera size={17} /> Tải ảnh</button></form>
      </section>
      <section className="card"><div className="card-title"><h2>Timeline xử lý</h2></div><ol className="timeline">{incident.histories.map((item) => <li key={item.id}><span className="timeline-dot" /><div><strong>{STATUS_LABEL[item.to_status]}</strong><span>{item.actor.full_name} · {new Date(item.created_at).toLocaleString('vi-VN')}</span>{item.note && <p>{item.note}</p>}</div></li>)}</ol></section>
    </div><aside className="detail-side">
      {(user?.role === 'ADMIN' || user?.role === 'DISPATCHER') && <section className="card action-card"><h2>Điều phối xử lý</h2>{incident.status === 'NEW' && <><button className="primary" onClick={() => status('ACCEPTED', 'Đã xác minh báo cáo')}><Check size={17} /> Tiếp nhận</button><button className="danger-outline" onClick={() => requestText('REJECTED', 'Nhập lý do từ chối (tối thiểu 5 ký tự):')}><X size={17} /> Từ chối</button></>}{incident.status === 'ACCEPTED' && <><label>Chọn nhân viên<select value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">— Chọn nhân viên —</option>{staff.data?.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><button className="primary" disabled={!staffId} onClick={() => mutation.mutate({ path: `/incidents/${id}/assign`, body: { staff_id: staffId, note: 'Phân công từ cổng điều phối' }, method: 'POST' })}><UserCheck size={17} /> Phân công</button></>}</section>}
      {user?.role === 'STAFF' && <section className="card action-card"><h2>Cập nhật nhiệm vụ</h2>{incident.status === 'ASSIGNED' && <button className="primary" onClick={() => status('IN_PROGRESS', 'Nhân viên xác nhận và bắt đầu xử lý')}>Bắt đầu xử lý</button>}{incident.status === 'IN_PROGRESS' && <button className="primary" onClick={() => requestText('RESOLVED', 'Nhập nội dung giải quyết (tối thiểu 10 ký tự):', true)}>Hoàn tất xử lý</button>}</section>}
      {user?.role === 'STUDENT' && incident.status === 'RESOLVED' && <section className="card action-card"><h2>Xác nhận kết quả</h2><button className="primary" onClick={() => mutation.mutate({ path: `/incidents/${id}/feedback`, body: { rating: 5, feedback: 'Đã kiểm tra, kết quả tốt.' }, method: 'POST' })}><Star size={17} /> Đánh giá 5 sao & đóng</button><button onClick={() => status('IN_PROGRESS', 'Kết quả chưa đạt, cần xử lý lại')}>Yêu cầu xử lý lại</button></section>}
    </aside></div>
  </>;
}
