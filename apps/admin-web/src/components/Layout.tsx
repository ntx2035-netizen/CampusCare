import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, Building2, ChartNoAxesCombined, ClipboardList, FileClock, LayoutDashboard, LogOut, Map, Menu, PlusCircle, Tags, UserRound, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api, getSession, websocketUrl } from '../api';
import { useAuth } from '../auth';
import type { Notification, Role } from '../types';
import { ACCOUNT_TYPE_LABEL } from '../types';

const nav: { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/report', label: 'Báo sự cố', icon: PlusCircle, roles: ['STUDENT'] },
  { to: '/incidents', label: 'Sự cố', icon: ClipboardList },
  { to: '/map', label: 'Bản đồ điều phối', icon: Map },
  { to: '/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { to: '/locations', label: 'Địa điểm', icon: Building2, roles: ['ADMIN'] },
  { to: '/categories', label: 'Loại sự cố', icon: Tags, roles: ['ADMIN'] },
  { to: '/reports', label: 'Thống kê', icon: ChartNoAxesCombined, roles: ['ADMIN', 'DISPATCHER'] },
  { to: '/audit', label: 'Audit log', icon: FileClock, roles: ['ADMIN'] },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { data: notifications = [] } = useQuery({ queryKey: ['notifications'], queryFn: () => api<Notification[]>('/notifications') });
  const unread = notifications.filter((item) => !item.is_read).length;

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const token = getSession()?.access_token;
    if (!token) return;
    let socket: WebSocket;
    let retry: number | undefined;
    const connect = () => {
      socket = new WebSocket(websocketUrl(), ['campuscare', getSession()?.access_token || '']);
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.event?.startsWith('incident.')) queryClient.invalidateQueries({ queryKey: ['incidents'] });
        if (message.event === 'user.location.updated') queryClient.invalidateQueries({ queryKey: ['user-locations'] });
        if (message.event === 'notification.created') queryClient.invalidateQueries({ queryKey: ['notifications'] });
      };
      socket.onclose = () => { retry = window.setTimeout(connect, 3000); };
    };
    connect();
    return () => { if (retry) clearTimeout(retry); socket!.onclose = null; socket!.close(); };
  }, [queryClient]);

  if (!user) return null;
  return <div className="shell">
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Activity /></span><span>CampusCare<small>Điều phối sự cố</small></span><button className="icon-button close-nav" onClick={() => setOpen(false)} aria-label="Đóng menu"><X /></button></div>
      <nav>{nav.filter((item) => !item.roles || item.roles.includes(user.role)).map(({ to, label, icon: Icon }) =>
        <NavLink key={to} to={to} end={to === '/'}><Icon size={19} /><span>{to === '/incidents' ? user.role === 'STAFF' ? 'Nhiệm vụ của tôi' : user.role === 'STUDENT' ? 'Sự cố của tôi' : label : label}</span></NavLink>
      )}</nav>
      <button className="logout" onClick={async () => { await logout(); queryClient.clear(); }}><LogOut size={18} /> Đăng xuất</button>
    </aside>
    {open && <button className="scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
    <main className="main">
      <div className="topbar">
        <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu /></button>
        <div className="topbar-spacer" />
        <NavLink to="/notifications" className="notification-button"><Bell size={20} />{unread > 0 && <span>{unread}</span>}</NavLink>
        <div className="identity"><div className="avatar">{user.full_name.slice(0, 1)}</div><div><strong>{user.full_name}</strong><small>{ACCOUNT_TYPE_LABEL[user.account_type]}</small></div></div>
      </div>
      <div className="content"><Outlet /></div>
    </main>
  </div>;
}
