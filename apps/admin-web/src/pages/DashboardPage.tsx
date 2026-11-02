import { useQuery } from '@tanstack/react-query';
import { AlertOctagon, CheckCircle2, Clock3, ClipboardList, LifeBuoy, MapPin, Send } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Incident, Summary } from '../types';
import { STATUS_LABEL } from '../types';

const COLORS = ['#22D3EE', '#8B5CF6', '#38BDF8', '#F59E0B', '#22C55E', '#EC4899', '#94A3B8'];

const tooltipStyle = {
  backgroundColor: '#0F172A',
  borderColor: 'rgba(148, 163, 184, 0.2)',
  borderRadius: '10px',
  color: '#F8FAFC',
  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
  fontSize: '13px',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: () => api<Incident[]>('/incidents') });
  const report = useQuery({ queryKey: ['summary'], queryFn: () => api<Summary>('/reports/summary'), enabled: user?.role === 'ADMIN' || user?.role === 'DISPATCHER' });
  if (incidents.isLoading) return <Loading />;
  if (incidents.error) return <ErrorState error={incidents.error} retry={() => incidents.refetch()} />;
  const data = incidents.data || [];
  const summary = report.data;
  const operations = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';
  const title = user?.role === 'STUDENT' ? 'Trang chủ sinh viên/giảng viên' : user?.role === 'STAFF' ? 'Bảng nhiệm vụ kỹ thuật' : 'Tổng quan vận hành';
  const subtitle = user?.role === 'STUDENT' ? 'Báo sự cố và theo dõi các yêu cầu hỗ trợ của bạn.' : user?.role === 'STAFF' ? 'Theo dõi các nhiệm vụ được điều phối giao cho bạn.' : 'Theo dõi tình hình xử lý sự cố trong toàn khuôn viên theo thời gian thực.';
  const open = data.filter((item) => !['CLOSED', 'REJECTED'].includes(item.status)).length;
  const emergency = data.filter((item) => item.priority === 'EMERGENCY' && !['CLOSED', 'REJECTED'].includes(item.status)).length;
  const resolved = data.filter((item) => ['RESOLVED', 'CLOSED'].includes(item.status)).length;
  const chartData = Object.entries(summary?.by_status || {}).map(([key, value]) => ({ name: STATUS_LABEL[key as keyof typeof STATUS_LABEL] || key, value }));
  if (user?.role === 'STUDENT') {
    const name = user.full_name.trim().split(/\s+/).pop() || 'bạn';
    return <>
      <PageHeader title={`Xin chào, ${name}`} subtitle="Bạn cần CampusCare hỗ trợ điều gì hôm nay?" />
      <section className="student-welcome">
        <div><span className="eyebrow">HỖ TRỢ SINH VIÊN</span><h2>Gửi yêu cầu, theo dõi tiến độ và nhận phản hồi tại một nơi.</h2><p>Thông tin của bạn sẽ được chuyển đến đúng bộ phận để xử lý nhanh hơn.</p></div>
        <Link to="/report" className="primary"><Send size={17} /> Gửi yêu cầu hỗ trợ</Link>
      </section>
      <section className="student-actions" aria-label="Các thao tác nhanh">
        <Link to="/report" className="student-action"><Send size={20} /><strong>Gửi yêu cầu</strong><span>Báo sự cố hoặc cần hỗ trợ</span></Link>
        <Link to="/incidents" className="student-action"><ClipboardList size={20} /><strong>Theo dõi yêu cầu</strong><span>Xem cập nhật mới nhất</span></Link>
        <Link to="/map" className="student-action"><MapPin size={20} /><strong>Xem địa điểm</strong><span>Kiểm tra khu vực trong trường</span></Link>
        <Link to="/notifications" className="student-action"><LifeBuoy size={20} /><strong>Thông báo</strong><span>Nhận phản hồi từ CampusCare</span></Link>
      </section>
      <section className="card student-recent"><div className="card-title"><div><h2>Yêu cầu gần đây</h2><p>Theo dõi trạng thái của những yêu cầu bạn đã gửi.</p></div><Link to="/incidents">Xem tất cả</Link></div>
        {!data.length ? <div className="student-empty"><ClipboardList size={28} /><strong>Bạn chưa có yêu cầu hỗ trợ nào.</strong><span>Nếu gặp vấn đề, CampusCare luôn sẵn sàng hỗ trợ bạn.</span><Link to="/report">Gửi yêu cầu đầu tiên</Link></div> : <div className="table-wrap"><table><thead><tr><th>Yêu cầu</th><th>Địa điểm</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{data.slice(0, 5).map((item) => <tr key={item.id}><td><Link to={`/incidents/${item.id}`}><strong>{item.title}</strong></Link><small>{item.code} · {item.category.name}</small></td><td>{item.location?.name || item.location_note || 'Chưa có địa điểm'}</td><td><StatusBadge status={STATUS_LABEL[item.status]} /></td><td>{new Date(item.created_at).toLocaleDateString('vi-VN')}</td></tr>)}</tbody></table></div>}
      </section>
    </>;
  }
  return <>
    <PageHeader title={title} subtitle={subtitle} />
    <div className="metrics">
      <article><span className="metric-icon blue"><ClipboardList size={24} /></span><div><small>Tổng sự cố</small><strong>{summary?.total ?? data.length}</strong><span>Tất cả báo cáo</span></div></article>
      <article><span className="metric-icon amber"><Clock3 size={24} /></span><div><small>Đang xử lý</small><strong>{open}</strong><span>Cần tiếp tục theo dõi</span></div></article>
      <article><span className="metric-icon red"><AlertOctagon size={24} /></span><div><small>Khẩn cấp</small><strong>{emergency}</strong><span>Cần ưu tiên ngay</span></div></article>
      <article><span className="metric-icon green"><CheckCircle2 size={24} /></span><div><small>Đã xử lý</small><strong>{resolved}</strong><span>{summary?.on_time_rate ?? 0}% đúng SLA</span></div></article>
    </div>
    {operations && <div className="dashboard-grid">
      <section className="card chart-card"><div className="card-title"><h2>Sự cố theo trạng thái</h2></div>{report.isLoading ? <Loading /> : chartData.length ? <ResponsiveContainer width="100%" height={270}><PieChart><Pie data={chartData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={98} paddingAngle={4}>{chartData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="rgba(7, 11, 20, 0.8)" strokeWidth={2} />)}</Pie><Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#22D3EE' }} /></PieChart></ResponsiveContainer> : <Empty />}</section>
      <section className="card chart-card"><div className="card-title"><h2>Khối lượng nhân viên</h2></div>{summary?.staff_workload?.length ? <ResponsiveContainer width="100%" height={270}><BarChart data={summary.staff_workload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" vertical={false} /><XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }} /><YAxis allowDecimals={false} stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'rgba(148, 163, 184, 0.15)' }} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(34, 211, 238, 0.05)' }} /><Bar dataKey="count" name="Nhiệm vụ" fill="#22D3EE" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer> : <Empty label="Chưa có dữ liệu phân công" />}</section>
    </div>}
    <section className="card"><div className="card-title"><div><h2>Sự cố mới nhất</h2><p>Danh sách tự cập nhật khi có thay đổi</p></div><Link to="/incidents">Xem tất cả</Link></div>
      {!data.length ? <Empty label="Chưa có sự cố nào" /> : <div className="table-wrap"><table><thead><tr><th>Mã</th><th>Sự cố</th><th>Địa điểm</th><th>Ưu tiên</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>{data.slice(0, 7).map((item) => <tr key={item.id}><td><Link to={`/incidents/${item.id}`} className="code">{item.code}</Link></td><td><strong>{item.title}</strong><small>{item.category.name}</small></td><td>{item.location?.name || item.location_note || (item.latitude != null && item.longitude != null ? 'Theo tọa độ' : 'Chưa có địa điểm')}</td><td><span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td><td><StatusBadge status={STATUS_LABEL[item.status]} /></td><td>{new Date(item.created_at).toLocaleString('vi-VN')}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
