import { useQuery } from '@tanstack/react-query';
import L, { LatLngBounds, type LatLngExpression } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Incident } from '../types';
import { STATUS_LABEL } from '../types';

function incidentMarker(priority: string) {
  return L.divIcon({ className: '', html: `<span class="map-pin map-pin-${priority.toLowerCase()}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function FitIncidents({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 18);
    else if (points.length > 1) map.fitBounds(new LatLngBounds(points), { padding: [35, 35], maxZoom: 18 });
  }, [map, points]);
  return null;
}

export default function MapPage() {
  const query = useQuery({ queryKey: ['incidents'], queryFn: () => api<Incident[]>('/incidents') });
  const [tileFailed, setTileFailed] = useState(false);
  const rows = useMemo(() => (query.data || []).filter((item) => item.latitude != null && item.longitude != null), [query.data]);
  const points = useMemo<LatLngExpression[]>(() => rows.map((item) => [item.latitude!, item.longitude!] as LatLngExpression), [rows]);

  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorState error={query.error} retry={() => query.refetch()} />;

  return <>
    <PageHeader title="Bản đồ người cần hỗ trợ" subtitle="Mỗi ghim là vị trí thiết bị của sinh viên tại thời điểm gửi báo cáo." />
    {!rows.length ? <section className="card"><Empty label="Chưa có báo cáo nào gửi kèm tọa độ GPS" /></section> : tileFailed ? <section className="card"><div className="map-fallback"><strong>Không tải được nền bản đồ OpenStreetMap.</strong><p>Tọa độ vẫn được lưu; bạn có thể mở sự cố từ danh sách dưới đây.</p>{rows.map((item) => <Link key={item.id} to={`/incidents/${item.id}`}><span>{item.code} · {item.title}</span><small>{item.latitude}, {item.longitude}</small></Link>)}</div></section> : <section className="card map-card">
      <MapContainer center={points[0]} zoom={18} scrollWheelZoom className="map">
        <FitIncidents points={points} />
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTileFailed(true) }} />
        {rows.map((item) => <Marker key={item.id} position={[item.latitude!, item.longitude!]} icon={incidentMarker(item.priority)}><Popup><div className="map-popup"><strong>{item.code}</strong><span>{item.title}</span><small>Người báo: {item.reporter.full_name}</small><small>GPS lúc gửi: {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}</small><StatusBadge status={STATUS_LABEL[item.status]} /><Link to={`/incidents/${item.id}`}>Mở và phân công</Link></div></Popup></Marker>)}
      </MapContainer>
    </section>}
  </>;
}
