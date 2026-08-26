import { describe, expect, it } from 'vitest';
import { ADMIN_ROUTES, homeForRole, OPERATIONS_ROUTES, STAFF_ROUTES, STUDENT_ROUTES } from '../routes';

describe('Điều hướng theo vai trò', () => {
  it('đưa nhân viên vào danh sách nhiệm vụ', () => expect(homeForRole('STAFF')).toBe('/tasks'));
  it('có đủ màn hình chính cho sinh viên', () => expect(STUDENT_ROUTES).toContain('/report'));
  it('không đưa màn hình báo sự cố vào luồng nhân viên', () => expect(STAFF_ROUTES).not.toContain('/report'));
  it('cho điều phối dùng màn hình điều phối trên app', () => expect(OPERATIONS_ROUTES).toContain('/tasks'));
  it('cho ADMIN duyệt tài khoản trên app', () => expect(ADMIN_ROUTES).toContain('/users'));
});
