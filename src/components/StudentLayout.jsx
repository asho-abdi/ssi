import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Award, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnnouncementBell } from './AnnouncementBell';
import { SSILogo } from './SSILogo';
import '../styles/student-dashboard.css';

const navBase = ({ isActive }) => `student-nav-link ${isActive ? 'active' : ''}`;

export function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="student-root">
      <header className="student-header">
        <div className="student-header-inner">
          <Link to="/" className="student-brand" aria-label="Home">
            <SSILogo withLink={false} className="student-brand-logo" />
          </Link>
          <nav className="student-nav" aria-label="Student navigation">
            <NavLink to="/student/courses" className={navBase} end>
              <BookOpen size={16} aria-hidden />
              My Courses
            </NavLink>
            <NavLink to="/student/certificates" className={navBase}>
              <Award size={16} aria-hidden />
              Certificates
            </NavLink>
          </nav>
          <div className="student-actions">
            <AnnouncementBell storageKey={`ann_seen_${user?.role || 'student'}`} />
            <span className="student-user-name" title={user?.name || ''}>
              {user?.name || 'Student'}
            </span>
            <button
              type="button"
              className="student-logout-btn"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={16} aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="student-main">
        <Outlet />
      </main>
    </div>
  );
}
