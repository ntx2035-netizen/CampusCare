import { useQuery, useQueryClient } from '@tanstack/react-query';
import L, { LatLngBounds, type LatLngExpression } from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorState, Loading, PageHeader, StatusBadge } from '../components/States';
import type { Incident, Role, User } from '../types';
import { ROLE_LABEL, STATUS_LABEL } from '../types';

function incidentMarker(priority: string) {
  return L.divIcon({ className: '', html: `<span class="map-pin map-pin-${priority.toLowerCase()}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function userMarker(role: Role) {
  return L.divIcon({ className: '', html: `<span class="map-user-pin map-user-${role.toLowerCase()}">${role === 'STUDENT' ? 'SV' : role === 'STAFF' ? 'KT' : role === 'DISPATCHER' ? 'ĐP' : 'AD'}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] });
}

function FitPoints({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 18);
    else if (points.length > 1) map.fitBounds(new LatLngBounds(points), { padding: [35, 35], maxZoom: 18 });
  }, [map, points]);
  return null;
}

export default function MapPage() {
  const { user, setUser } = useAuth();
  const client = useQueryClient();
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: () => api<Incident[]>('/incidents') });
  const canCoordinate = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';
  const deviceLocations = useQuery({ queryKey: ['user-locations'], queryFn: () => api<User[]>('/users/locations'), enabled: canCoordinate });
  const [tileFailed, setTileFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const rows = useMemo(() => (incidents.data || []).filter((item) => item.latitude != null && item.longitude != null), [incidents.data]);
  const locatedUsers = useMemo(() => (deviceLocations.data || []).filter((item) => item.current_latitude != null && item.current_longitude != null), [deviceLocations.data]);
  const points = useMemo<LatLngExpression[]>(() => [
    ...rows.map((item) => [item.latitude!, item.longitude!] as LatLngExpression),
    ...locatedUsers.map((item) => [item.current_latitude!, item.current_longitude!] as LatLngExpression),
  ], [rows, locatedUsers]);

  async function updateMyLocation() {
    if (!navigator.geolocation) { setLocationMessage('Trình duyệt không hỗ trợ định vị.'); return; }
    setLocating(true); setLocationMessage('');
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const updated = await api<User>('/users/me/location', { method: 'PATCH', body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }) });
        setUser(updated); await client.invalidateQueries({ queryKey: ['user-locations'] }); setLocationMessage('Đã cập nhật vị trí của bạn.');
      } catch (reason) { setLocationMessage(reason instanceof Error ? reason.message : 'Không thể lưu vị trí'); }
      finally { setLocating(false); }
    }, (error) => { setLocating(false); setLocationMessage(error.code === 1 ? 'Bạn chưa cấp quyền vị trí cho trình duyệt.' : 'Không lấy được vị trí thiết bị.'); }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 });
  }

  if (incidents.isLoading) return <Loading />;
  if (incidents.error) return <ErrorState error={incidents.error} retry={() => incidents.refetch()} />;

  return <>
    <PageHeader title="Bản đồ điều phối" subtitle="Ghim sự cố là vị trí lúc gửi báo cáo; ghim SV/KT/ĐP/AD là vị trí thiết bị được người dùng chủ động cập nhật." action={<button className="primary" onClick={updateMyLocation} disabled={locating}>{locating ? 'Đang lấy GPS…' : 'Cập nhật vị trí của tôi'}</button>} />
    {locationMessage ? <div className={`notice ${locationMessage.startsWith('Đã') ? 'success' : 'error'}`}>{locationMessage}</div> : null}
    {deviceLocations.error && canCoordinate ? <div className="notice error">Không tải được vị trí thiết bị: {(deviceLocations.error as Error).message}</div> : null}
    {!points.length ? <section className="card"><Empty label="Chưa có sự cố hoặc tài khoản nào gửi vị trí GPS" /></section> : tileFailed ? <section className="card"><div className="map-fallback"><strong>Không tải được nền bản đồ OpenStreetMap.</strong><p>Tọa độ vẫn được lưu trong hệ thống.</p>{rows.map((item) => <Link key={item.id} to={`/incidents/${item.id}`}><span>{item.code} · {item.title}</span><small>{item.latitude}, {item.longitude}</small></Link>)}</div></section> : <section className="card map-card">
      <MapContainer center={points[0]} zoom={18} scrollWheelZoom className="map">
        <FitPoints points={points} />
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTileFailed(true) }} />
        {rows.map((item) => <Marker key={`incident-${item.id}`} position={[item.latitude!, item.longitude!]} icon={incidentMarker(item.priority)}><Popup><div className="map-popup"><strong>{item.code}</strong><span>{item.title}</span><small>Người báo: {item.reporter.full_name}</small>{item.location ? <small>Địa điểm: {item.location.name}</small> : null}{item.location_note ? <small>Chi tiết: {item.location_note}</small> : null}<small>GPS lúc gửi: {item.latitude?.toFixed(6)}, {item.longitude?.toFixed(6)}</small><StatusBadge status={STATUS_LABEL[item.status]} /><Link to={`/incidents/${item.id}`}>Mở và phân công</Link></div></Popup></Marker>)}
        {locatedUsers.map((item) => <Marker key={`user-${item.id}`} position={[item.current_latitude!, item.current_longitude!]} icon={userMarker(item.role)}><Popup><div className="map-popup"><strong>{item.full_name}</strong><span>{ROLE_LABEL[item.role]}</span><small>Cập nhật: {item.location_updated_at ? new Date(item.location_updated_at).toLocaleString('vi-VN') : 'Không rõ'}</small><small>Sai số GPS: {item.location_accuracy != null ? `khoảng ${Math.round(item.location_accuracy)} m` : 'Không rõ'}</small></div></Popup></Marker>)}
      </MapContainer>
    </section>}
  </>;
}
