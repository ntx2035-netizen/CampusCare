import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_LABEL } from '../types';

export function Loading({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return <div className="state"><LoaderCircle className="spin" size={30} /><span>{label}</span></div>;
}
export function Empty({ label = 'Chưa có dữ liệu' }: { label?: string }) {
  return <div className="state"><Inbox size={34} /><span>{label}</span></div>;
}
export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  return <div className="state error"><AlertTriangle size={34} /><strong>Không tải được dữ liệu</strong><span>{error.message}</span>{retry && <button onClick={retry}>Thử lại</button>}</div>;
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</header>;
}
export function StatusBadge({ status }: { status: string }) {
  const raw = Object.entries(STATUS_LABEL).find(([, label]) => label === status)?.[0] || status;
  const label = STATUS_LABEL[raw as keyof typeof STATUS_LABEL] || status;
  return <span className={`badge status-${raw.toLowerCase()}`}>{label}</span>;
}
