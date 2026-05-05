import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/** Default /dashboard landing: redirect by role */
export function DashboardIndex() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--muted, #64748b)', textAlign: 'center' }}>Loading…</div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (user.role === 'teacher') {
    return <Navigate to="/dashboard/teacher/courses" replace />;
  }
  if (user.role === 'editor') {
    return <Navigate to="/dashboard/editor/courses" replace />;
  }

  return <Navigate to="/" replace />;
}
