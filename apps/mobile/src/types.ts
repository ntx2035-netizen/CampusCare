export type Role = 'STUDENT' | 'STAFF' | 'DISPATCHER' | 'ADMIN';
export type AccountType = 'STUDENT' | 'LECTURER' | 'STAFF' | 'DISPATCHER' | 'ADMIN';
export type Status = 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export interface User { id: string; email: string; full_name: string; role: Role; account_type: AccountType; email_verified: boolean; approved_at?: string; phone?: string; is_active: boolean; }
export interface Session { access_token: string; refresh_token: string; expires_in: number; user: User; }
export interface RegistrationResult { status: 'ACTIVE' | 'PENDING_APPROVAL'; message: string; session?: Session; }
export interface Location { id: string; name: string; code: string; kind: string; latitude?: number; longitude?: number; qr_token: string; }
export interface Category { id: string; name: string; description?: string; sla_minutes: number; }
export interface History { id: string; actor: User; from_status?: Status; to_status: Status; note?: string; created_at: string; }
export interface IncidentImage { id: string; kind: string; url?: string; }
export interface Incident { id: string; code: string; title: string; description: string; status: Status; priority: string; category: Category; reporter: User; location?: Location; latitude?: number; longitude?: number; assigned_staff?: User; resolution?: string; created_at: string; histories: History[]; images: IncidentImage[]; }
export interface Notification { id: string; title: string; message: string; data: Record<string, unknown>; is_read: boolean; created_at: string; }
export interface ReportPayload { title: string; description: string; category_id: string; priority: string; location_id?: string; latitude?: number; longitude?: number; idempotency_key: string; }
export interface QueueItem { id: string; payload: ReportPayload; imageUris: string[]; status: 'WAITING' | 'SYNCING' | 'ERROR'; error?: string; createdAt: string; }

export const STATUS_LABEL: Record<Status, string> = { NEW: 'Mới', ACCEPTED: 'Đã tiếp nhận', ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý', CLOSED: 'Đã đóng', REJECTED: 'Từ chối' };
