import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Incident, IncidentStatus } from '../types';
import { STATUS_LABEL } from '../types';

export default function IncidentsPage() {
  const [status, setStatus] = useState(''); const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['incidents', status], queryFn: () => api<Incident[]>(`/incidents${status ? `?status=${status}` : ''}`) });
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const rows = (query.data || []).filter((item) => `${item.code} ${item.title}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader title="Quản lý sự cố" subtitle="Tiếp nhận, phân công và giám sát tiến độ xử lý." />
    <section className="card filters"><div className="search"><Search size={18} /><input placeholder="Tìm theo mã hoặc tiêu đề…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></section>
    <section className="card">{!rows.length ? <Empty label="Không có sự cố phù hợp" /> : <div className="table-wrap"><table><thead><tr><th>Mã sự cố</th><th>Nội dung</th><th>Người báo</th><th>Địa điểm</th><th>Nhân viên</th><th>Trạng thái</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><Link className="code" to={`/incidents/${item.id}`}>{item.code}</Link><small>{new Date(item.created_at).toLocaleDateString('vi-VN')}</small></td><td><strong>{item.title}</strong><small>{item.category.name} · <span className={`priority-text priority-${item.priority.toLowerCase()}`}>{item.priority}</span></small></td><td>{item.reporter.full_name}</td><td>{item.location?.name || `${item.latitude}, ${item.longitude}`}</td><td>{item.assigned_staff?.full_name || 'Chưa phân công'}</td><td><StatusBadge status={STATUS_LABEL[item.status as IncidentStatus]} /></td></tr>)}</tbody></table></div>}</section>
  </>;
}

