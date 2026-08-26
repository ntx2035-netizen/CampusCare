import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import MapPage from './pages/MapPage';
import { AuditPage, CategoriesPage, LocationsPage, NotificationsPage, ProfilePage, ReportsPage, UsersPage } from './pages/ManagementPages';
import type { Role } from './types';
import StudentReportPage from './pages/StudentReportPage';

function Guard({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
    <Route element={<Guard><Layout /></Guard>}>
      <Route index element={<DashboardPage />} />
      <Route path="incidents" element={<IncidentsPage />} />
      <Route path="report" element={<Guard roles={['STUDENT']}><StudentReportPage /></Guard>} />
      <Route path="incidents/:id" element={<IncidentDetailPage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="users" element={<Guard roles={['ADMIN']}><UsersPage /></Guard>} />
      <Route path="locations" element={<Guard roles={['ADMIN']}><LocationsPage /></Guard>} />
      <Route path="categories" element={<Guard roles={['ADMIN']}><CategoriesPage /></Guard>} />
      <Route path="reports" element={<Guard roles={['ADMIN', 'DISPATCHER']}><ReportsPage /></Guard>} />
      <Route path="audit" element={<Guard roles={['ADMIN']}><AuditPage /></Guard>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
