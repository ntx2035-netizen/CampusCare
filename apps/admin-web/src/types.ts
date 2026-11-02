export type Role = 'STUDENT' | 'STAFF' | 'DISPATCHER' | 'ADMIN';
export type AccountType = 'STUDENT' | 'LECTURER' | 'STAFF' | 'DISPATCHER' | 'ADMIN';
export type IncidentStatus = 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REJECTED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export interface User {
  id: string; email: string; full_name: string; role: Role; account_type: AccountType;
  email_verified: boolean; approved_at?: string; phone?: string; date_of_birth?: string; temporary_residence?: string; student_cohort?: string; avatar_url?: string; is_active: boolean; created_at: string;
  current_latitude?: number; current_longitude?: number; location_accuracy?: number; location_updated_at?: string;
}
export interface Location {
  id: string; name: string; code: string; kind: 'AREA' | 'BUILDING' | 'FLOOR' | 'ROOM';
  parent_id?: string; latitude?: number; longitude?: number; qr_token: string; is_active: boolean;
}
export interface Category { id: string; name: string; description?: string; sla_minutes: number; is_active: boolean; }
export interface Timeline { id: string; actor: User; from_status?: IncidentStatus; to_status: IncidentStatus; note?: string; created_at: string; }
export interface IncidentImage { id: string; kind: 'REPORT' | 'BEFORE' | 'AFTER'; content_type: string; size: number; created_at: string; url?: string; }
export interface Incident {
  id: string; code: string; title: string; description: string; category: Category; priority: Priority;
  reporter: User; location?: Location; location_note?: string; latitude?: number; longitude?: number; assigned_staff?: User;
  status: IncidentStatus; resolution?: string; rejection_reason?: string; rating?: number; feedback?: string;
  due_at?: string; created_at: string; updated_at: string; histories: Timeline[]; images: IncidentImage[];
}
export interface TokenPair { access_token: string; refresh_token: string; expires_in: number; user: User; }
export interface RegistrationResult { status: 'ACTIVE' | 'PENDING_APPROVAL'; message: string; session?: TokenPair; }
export interface Summary {
  total: number; by_status: Record<string, number>; by_category: Record<string, number>;
  average_resolution_hours: number; on_time_rate: number;
  staff_workload: { staff_id: string; name: string; count: number }[];
}
export interface Notification { id: string; title: string; message: string; type: string; data: Record<string, unknown>; is_read: boolean; created_at: string; }
export interface Audit { id: string; actor_id?: string; action: string; entity_type: string; entity_id?: string; details: Record<string, unknown>; ip_address?: string; created_at: string; }

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  NEW: 'Mới', ACCEPTED: 'Đã tiếp nhận', ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã xử lý', CLOSED: 'Đã đóng', REJECTED: 'Từ chối',
};
export const ROLE_LABEL: Record<Role, string> = { STUDENT: 'Sinh viên', STAFF: 'Nhân viên', DISPATCHER: 'Điều phối viên', ADMIN: 'Quản trị viên' };
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { STUDENT: 'Sinh viên ICTU', LECTURER: 'Giảng viên ICTU', STAFF: 'Nhân viên sửa chữa', DISPATCHER: 'Điều phối viên', ADMIN: 'Quản trị viên' };
