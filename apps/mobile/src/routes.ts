export const PUBLIC_ROUTES = ['/', '/login'] as const;
export const STUDENT_ROUTES = ['/home', '/report', '/scan', '/select-location', '/incidents', '/notifications', '/profile'] as const;
export const STAFF_ROUTES = ['/home', '/tasks', '/notifications', '/profile'] as const;
export const OPERATIONS_ROUTES = ['/home', '/tasks', '/notifications', '/profile'] as const;
export const ADMIN_ROUTES = [...OPERATIONS_ROUTES, '/users'] as const;

export function homeForRole(role?: string) {
  return role === 'STAFF' ? '/tasks' : '/home';
}
