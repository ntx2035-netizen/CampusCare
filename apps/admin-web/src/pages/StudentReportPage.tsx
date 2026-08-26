import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, LocateFixed, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ErrorState, Loading, PageHeader } from '../components/States';
import type { Category, Incident, Location } from '../types';

export default function StudentReportPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories') });
  const locations = useQuery({ queryKey: ['locations'], queryFn: () => api<Location[]>('/locations') });
  const create = useMutation({
    mutationFn: async ({ payload, image }: { payload: object; image?: File }) => {
      const incident = await api<Incident>('/incidents', { method: 'POST', body: JSON.stringify(payload) });
      if (image) {
        const form = new FormData(); form.append('kind', 'REPORT'); form.append('file', image);
        await api(`/incidents/${incident.id}/images`, { method: 'POST', body: form });
      }
      return incident;
    },
    onSuccess: (incident) => navigate(`/incidents/${incident.id}`),
    onError: (error: Error) => setMessage(error.message),
  });

  function locate() {
    setMessage('');
    if (!navigator.geolocation) { setMessage('Trình duyệt không hỗ trợ định vị.'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setMessage('Không lấy được GPS. Hãy cấp quyền vị trí cho trình duyệt.'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('');
    const form = new FormData(event.currentTarget);
    const image = form.get('image');
    create.mutate({
      payload: {
        title: form.get('title'), description: form.get('description'),
        category_id: form.get('category_id'), priority: form.get('priority'),
        location_id: form.get('location_id') || undefined,
        latitude: position?.latitude, longitude: position?.longitude,
        idempotency_key: crypto.randomUUID(),
      },
      image: image instanceof File && image.size ? image : undefined,
    });
  }

  if (categories.isLoading || locations.isLoading) return <Loading />;
  if (categories.error || locations.error) return <ErrorState error={categories.error || locations.error || new Error('Không tải được dữ liệu')} />;
  return <><PageHeader title="Báo cáo sự cố" subtitle="Gửi nội dung, ảnh và GPS cho bộ phận điều phối ICTU." />
    {message && <div className="notice error">{message}</div>}
    <section className="card"><form className="form-grid" onSubmit={submit}>
      <label>Tiêu đề<input name="title" minLength={5} maxLength={200} required /></label>
      <label>Loại sự cố<select name="category_id" required><option value="">— Chọn loại —</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Mức độ<select name="priority" defaultValue="MEDIUM"><option value="LOW">Thấp</option><option value="MEDIUM">Trung bình</option><option value="HIGH">Cao</option><option value="EMERGENCY">Khẩn cấp</option></select></label>
      <label>Phòng/khu vực<select name="location_id"><option value="">Dùng GPS</option>{locations.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label className="full-field">Mô tả<textarea name="description" minLength={10} maxLength={5000} rows={5} required /></label>
      <label>Ảnh hiện trường<div className="input-with-icon"><Camera size={18} /><input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></div></label>
      <div><button type="button" className="small-button" onClick={locate}><LocateFixed size={17} /> Lấy vị trí của tôi</button><small>{position ? ` ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}` : ' Chưa lấy GPS'}</small></div>
      <button className="primary" disabled={create.isPending}><Send size={17} /> {create.isPending ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
    </form></section>
  </>;
}
