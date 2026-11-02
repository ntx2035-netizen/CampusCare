import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Camera, CheckCircle2, LifeBuoy, LocateFixed, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ErrorState, Loading, PageHeader } from '../components/States';
import type { Category, Incident, Location } from '../types';

export default function StudentReportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [createdIncident, setCreatedIncident] = useState<Incident | null>(null);
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories') });
  const locations = useQuery({ queryKey: ['locations'], queryFn: () => api<Location[]>('/locations') });

  const create = useMutation({
    mutationFn: async ({ payload, image }: { payload: object; image?: File }) => {
      const incident = await api<Incident>('/incidents', { method: 'POST', body: JSON.stringify(payload) });
      if (image) {
        const form = new FormData();
        form.append('kind', 'REPORT');
        form.append('file', image);
        await api(`/incidents/${incident.id}/images`, { method: 'POST', body: form });
      }
      return incident;
    },
    onSuccess: (incident) => { setCreatedIncident(incident); setStep(3); },
    onError: (error: Error) => setMessage(error.message),
  });

  function locate() {
    setMessage('');
    if (!navigator.geolocation) { setMessage('Trình duyệt này chưa hỗ trợ định vị.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setMessage('Không lấy được GPS. Hãy cấp quyền vị trí cho trình duyệt rồi thử lại.'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    const form = new FormData(event.currentTarget);
    const image = form.get('image');
    create.mutate({
      payload: {
        title: form.get('title'), description: form.get('description'),
        location_note: form.get('location_note') || undefined,
        category_id: selectedCategory?.id, priority: form.get('priority') || 'MEDIUM',
        location_id: form.get('location_id') || undefined,
        latitude: position?.latitude, longitude: position?.longitude, idempotency_key: crypto.randomUUID(),
      },
      image: image instanceof File && image.size ? image : undefined,
    });
  }

  if (categories.isLoading || locations.isLoading) return <Loading label="Đang chuẩn bị biểu mẫu hỗ trợ…" />;
  if (categories.error || locations.error) return <ErrorState error={categories.error || locations.error || new Error('Không tải được dữ liệu')} />;

  return <div className="student-request-flow">
    <div className="request-steps" aria-label={`Bước ${step} trong 3`}>
      <span className={step >= 1 ? 'active' : ''}>1. Chọn vấn đề</span><i />
      <span className={step >= 2 ? 'active' : ''}>2. Thêm thông tin</span><i />
      <span className={step >= 3 ? 'active' : ''}>3. Hoàn tất</span>
    </div>

    {step === 1 && <>
      <PageHeader title="Bạn đang cần hỗ trợ vấn đề gì?" subtitle="Chọn một nhóm vấn đề. CampusCare sẽ chuyển yêu cầu đến đúng bộ phận." />
      <section className="request-category-grid" aria-label="Danh mục hỗ trợ">
        {categories.data?.map((category) => <button key={category.id} type="button" className="request-category" onClick={() => { setSelectedCategory(category); setStep(2); }}>
          <LifeBuoy size={21} /><strong>{category.name}</strong><span>{category.description || 'Gửi thông tin để được hỗ trợ'}</span>
        </button>)}
      </section>
    </>}

    {step === 2 && selectedCategory && <>
      <button type="button" className="back" onClick={() => setStep(1)}><ArrowLeft size={17} /> Chọn lại vấn đề</button>
      <PageHeader title={`Thông tin về ${selectedCategory.name}`} subtitle="Chỉ cần các thông tin cần thiết để chúng tôi hiểu và hỗ trợ đúng việc." />
      {message && <div className="notice error" role="alert">{message}</div>}
      <section className="card request-form-card">
        <form className="form-grid" onSubmit={submit}>
          <label className="full-field">Tiêu đề ngắn gọn<input name="title" minLength={5} maxLength={200} placeholder="Ví dụ: Đèn hành lang bị hỏng" required /></label>
          <label>Mức độ<select name="priority" defaultValue="MEDIUM"><option value="LOW">Thấp — có thể chờ</option><option value="MEDIUM">Trung bình — cần xử lý sớm</option><option value="HIGH">Cao — ảnh hưởng học tập/công việc</option><option value="EMERGENCY">Khẩn cấp — nguy hiểm hoặc gấp</option></select></label>
          <label>Phòng hoặc khu vực<select name="location_id"><option value="">Chưa chọn</option>{locations.data?.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
          <label className="full-field">Mô tả chi tiết<textarea name="description" minLength={10} maxLength={5000} rows={5} placeholder="Điều gì đang xảy ra, từ khi nào và ảnh hưởng như thế nào?" required /></label>
          <label className="full-field">Vị trí chi tiết (nếu cần)<input name="location_note" maxLength={500} placeholder="Ví dụ: hành lang phía sau tòa C, gần cầu thang" /></label>
          <label>Ảnh hiện trạng (không bắt buộc)<span className="file-field"><Camera size={17} /><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></span></label>
          <div className="location-field"><button type="button" className="secondary-action" onClick={locate}><LocateFixed size={17} /> {position ? 'Cập nhật vị trí GPS' : 'Thêm vị trí GPS'}</button><small>{position ? `Đã lấy vị trí: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}` : 'GPS giúp bộ phận xử lý tìm đúng vị trí nhanh hơn.'}</small></div>
          <div className="full-field request-submit"><button type="submit" className="primary" disabled={create.isPending}><Send size={17} /> {create.isPending ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu hỗ trợ'}</button></div>
        </form>
      </section>
    </>}

    {step === 3 && createdIncident && <section className="request-success">
      <CheckCircle2 size={48} /><h1>Yêu cầu đã được tiếp nhận</h1><p>CampusCare đã nhận yêu cầu <strong>{createdIncident.code}</strong>. Bạn sẽ nhận thông báo khi có cập nhật từ bộ phận phụ trách.</p>
      <div><Link to={`/incidents/${createdIncident.id}`} className="primary">Xem tiến độ xử lý</Link><Link to="/" className="secondary-link">Về trang chủ</Link></div>
    </section>}
  </div>;
}
