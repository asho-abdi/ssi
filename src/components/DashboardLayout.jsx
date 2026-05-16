import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Users,
  ChevronDown,
  CreditCard,
  FileCheck2,
  DollarSign,
  UserCircle,
  PenLine,
  MessageSquareText,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  PlayCircle,
  Award,
  Bell,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AnnouncementBell } from './AnnouncementBell';
import { SSILogo } from './SSILogo';
import '../styles/dashboard.css';

const navBase = { className: ({ isActive }) => `dash-nav-link ${isActive ? 'active' : ''}` };

function dashboardHeaderMeta(pathname) {
  const rules = [
    { startsWith: '/dashboard/admin/users/students/', title: 'Student Report', subtitle: 'Learning progress and enrollment detail' },
    { startsWith: '/dashboard/admin/users', title: 'Users', subtitle: 'Manage students, instructors, and editors' },
    { startsWith: '/dashboard/admin/enrollments', title: 'Enrollments', subtitle: 'Review approvals and course access' },
    { startsWith: '/dashboard/admin/categories', title: 'Categories', subtitle: 'Organize catalog structure and metadata' },
    { startsWith: '/dashboard/admin/courses', title: 'Courses', subtitle: 'Manage all course content and status' },
    { startsWith: '/dashboard/admin/payments', title: 'Payments', subtitle: 'Track transactions and payment proofs' },
    { startsWith: '/dashboard/admin/reports', title: 'Reports', subtitle: 'Analyze revenue, users, and course performance' },
    { startsWith: '/dashboard/admin/settings', title: 'Settings', subtitle: 'Configure platform and monetization options' },
    { startsWith: '/dashboard/admin/announcements', title: 'Announcements', subtitle: 'Publish dashboard communication updates' },
    { startsWith: '/dashboard/admin/reviews', title: 'Reviews', subtitle: 'Moderate student feedback and ratings' },
    { startsWith: '/dashboard/admin/certificates', title: 'Certificates', subtitle: 'Create and manage completion certificates' },
    { startsWith: '/dashboard/admin/offline-enrollments', title: 'Offline Enrollments', subtitle: 'Manage in-person class registrations and attendance' },
    { startsWith: '/dashboard/admin/refunds', title: 'Refunds', subtitle: 'Review and manage student refund requests' },
    { startsWith: '/dashboard/admin/commissions', title: 'Commissions', subtitle: 'Revenue sharing, instructor earnings, and platform income' },
    { startsWith: '/dashboard/notifications', title: 'Notifications', subtitle: 'Announcements, thread updates, and course alerts' },
    { startsWith: '/dashboard/teacher/courses', title: 'Instructor Courses', subtitle: 'Build and edit your learning products' },
    { startsWith: '/dashboard/teacher/earnings', title: 'Earnings', subtitle: 'Revenue trends and payout overview' },
    { startsWith: '/dashboard/teacher/profile', title: 'Instructor Profile', subtitle: 'Update your profile and public information' },
    { startsWith: '/dashboard/editor/courses', title: 'Editor Workspace', subtitle: 'Review and update course content' },
    { startsWith: '/dashboard/admin', title: 'Admin Overview', subtitle: 'System health and key platform metrics' },
  ];
  return rules.find((rule) => pathname.startsWith(rule.startsWith)) || { title: 'Dashboard', subtitle: 'Your workspace overview' };
}

function SidebarContent({ role, onNavigate }) {
  const roleLabel = role === 'teacher' ? 'Instructor' : role;
  const { logout, hasPermission } = useAuth();
  const location = useLocation();
  const usersPathActive =
    location.pathname.startsWith('/dashboard/admin/users') ||
    location.pathname.startsWith('/dashboard/admin/enrollments');
  const courseMgmtPathActive =
    location.pathname.startsWith('/dashboard/admin/courses') ||
    location.pathname.startsWith('/dashboard/admin/categories');
  const [usersMenuOpen, setUsersMenuOpen] = useState(usersPathActive);
  const [courseMenuOpen, setCourseMenuOpen] = useState(courseMgmtPathActive);

  const link = (to, icon, label) => (
    <NavLink to={to} {...navBase} onClick={onNavigate}>
      {icon}
      <span>{label}</span>
    </NavLink>
  );

  return (
    <>
      <div className="dash-brand">
        <SSILogo full withLink={false} className="dash-brand-logo" />
        <div>
          <div className="dash-role">
            <span className="dash-role-cap">{roleLabel}</span> dashboard
          </div>
        </div>
      </div>

      <nav className="dash-nav">
        {link('/dashboard', <LayoutDashboard size={20} />, 'Overview')}
        {role === 'admin' && (
          <div className={`dash-courses-dropdown ${courseMgmtPathActive ? 'active' : ''}`}>
            <button
              type="button"
              className="dash-courses-toggle"
              onClick={() => setCourseMenuOpen((open) => !open)}
              aria-expanded={courseMenuOpen}
            >
              <span className="dash-courses-toggle-left">
                <BookOpen size={20} />
                <span>Course management</span>
              </span>
              <ChevronDown size={16} className={`dash-courses-chevron ${courseMenuOpen ? 'open' : ''}`} />
            </button>
            {courseMenuOpen && (
              <div className="dash-courses-submenu">
                <NavLink to="/dashboard/admin/courses" {...navBase} onClick={onNavigate}>
                  <span>All courses</span>
                </NavLink>
                <NavLink to="/dashboard/admin/categories" {...navBase} onClick={onNavigate}>
                  <span>Categories</span>
                </NavLink>
              </div>
            )}
          </div>
        )}
        {role === 'admin' && (
          <>
            {link('/dashboard/admin/enrollments', <Users size={20} />, 'Enrollments')}
            {link('/dashboard/admin/payments', <CreditCard size={20} />, 'Payments')}
            {link('/dashboard/admin/reports', <DollarSign size={20} />, 'Reports')}
            {link('/dashboard/admin/announcements', <Megaphone size={20} />, 'Announcements')}
            {link('/dashboard/admin/reviews', <MessageSquareText size={20} />, 'Reviews')}
            {link('/dashboard/admin/certificates', <FileCheck2 size={20} />, 'Certificates')}
            {link('/dashboard/admin/offline-enrollments', <ClipboardList size={20} />, 'Offline Enrollments')}
            {link('/dashboard/admin/refunds', <RotateCcw size={20} />, 'Refunds')}
            {link('/dashboard/admin/commissions', <DollarSign size={20} />, 'Commissions')}
            {link('/dashboard/notifications', <Bell size={20} />, 'Notifications')}
            <div className={`dash-users-dropdown ${usersPathActive ? 'active' : ''}`}>
              <button
                type="button"
                className="dash-users-toggle"
                onClick={() => setUsersMenuOpen((open) => !open)}
                aria-expanded={usersMenuOpen}
              >
                <span className="dash-users-toggle-left">
                  <Users size={20} />
                  <span>Users</span>
                </span>
                <ChevronDown size={16} className={`dash-users-chevron ${usersMenuOpen ? 'open' : ''}`} />
              </button>
              {usersMenuOpen && (
                <div className="dash-users-submenu">
                  <NavLink to="/dashboard/admin/users/students" {...navBase} onClick={onNavigate}>
                    <span>All students</span>
                  </NavLink>
                  <NavLink to="/dashboard/admin/users/teachers" {...navBase} onClick={onNavigate}>
                    <span>All instructors</span>
                  </NavLink>
                  <NavLink to="/dashboard/admin/users/editors" {...navBase} onClick={onNavigate}>
                    <span>All editors</span>
                  </NavLink>
                  <NavLink to="/dashboard/admin/enrollments" {...navBase} onClick={onNavigate}>
                    <span>Enrollments</span>
                  </NavLink>
                </div>
              )}
            </div>
            {link('/dashboard/admin/settings', <Settings size={20} />, 'Settings')}
          </>
        )}
        {role === 'teacher' && (
          <>
            {(hasPermission('editCourse') || hasPermission('manageLessons')) &&
              link('/dashboard/teacher/courses', <BookOpen size={20} />, 'My courses')}
            {hasPermission('createCourse') && link('/dashboard/teacher/courses/new', <PlusCircle size={20} />, 'Add course')}
            {hasPermission('viewEarnings') && link('/dashboard/teacher/earnings', <DollarSign size={20} />, 'Earnings')}
            {link('/dashboard/teacher/profile', <UserCircle size={20} />, 'Profile')}
            {link('/dashboard/notifications', <Bell size={20} />, 'Notifications')}
          </>
        )}
        {role === 'editor' && (
          <>
            {(hasPermission('editCourse') || hasPermission('manageLessons')) && link('/dashboard/editor/courses', <PenLine size={20} />, 'Courses')}
            {link('/dashboard/notifications', <Bell size={20} />, 'Notifications')}
          </>
        )}
        {role === 'student' && (
          <>
            {link('/dashboard/student/courses', <PlayCircle size={20} />, 'My learning')}
            {link('/dashboard/student/certificates', <Award size={20} />, 'Certificates')}
            {link('/dashboard/notifications', <Bell size={20} />, 'Notifications')}
          </>
        )}
      </nav>

      <div className="dash-footer">
        <button type="button" className="btn btn-secondary dash-logout" onClick={() => logout()}>
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </>
  );
}

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#f7f9fb';
    document.body.style.color = '#1a202c';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  if (!user) return null;
  if (user.role === 'student') return <Navigate to="/student/courses" replace />;

  const close = () => setOpen(false);
  const head = dashboardHeaderMeta(location.pathname);

  return (
    <div className="dash-root">
      <button
        type="button"
        className="dash-mobile-toggle"
        aria-label="Toggle menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      {open && <div className="dash-overlay" role="presentation" onClick={close} />}
      <aside className={`dash-sidebar ${open ? 'open' : ''}`}>
        <SidebarContent role={user.role} onNavigate={close} />
      </aside>
      <main className="dash-main">
        <header className="dash-topbar">
          <div className="dash-topbar-main">
            <button type="button" className="dash-back" onClick={() => navigate('/')}>
              ← Storefront
            </button>
            <div className="dash-topbar-copy">
              <strong>{head.title}</strong>
              <span>{head.subtitle}</span>
            </div>
          </div>
          <div className="dash-topbar-actions">
            <AnnouncementBell storageKey={`ann_seen_${user.role || 'user'}`} />
            <span className="dash-user-name">{user.name}</span>
            <button type="button" className="btn btn-secondary dash-topbar-logout" onClick={() => logout()}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>
        <div className="dash-content">
          <Outlet />
        </div>
      </main>
      <style>{`
        .dash-root {
          min-height: 100vh;
          display: flex;
        }
        .dash-brand-logo {
          width: 130px;
          height: auto;
          display: block;
          object-fit: contain;
          filter: brightness(1.08);
          margin-bottom: 0.2rem;
        }
        .dash-brand-icon {
          width: 34px;
          height: 34px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .dash-role-cap {
          text-transform: capitalize;
        }
        .dash-sidebar {
          width: var(--sidebar-width);
          flex-shrink: 0;
          padding: 0.95rem 0.62rem;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          z-index: 12;
        }
        .dash-brand {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.55rem;
          padding: 0.35rem 0.62rem 0.9rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 1rem;
        }
        .dash-role {
          font-size: 0.68rem;
          line-height: 1.35;
          letter-spacing: 0.02em;
        }
        .dash-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }
        .dash-nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.48rem 0.66rem;
          border-radius: 10px;
          text-decoration: none !important;
          font-weight: 500;
          font-size: 0.84rem;
          border-left: 3px solid transparent;
        }
        .dash-users-dropdown,
        .dash-courses-dropdown {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .dash-users-toggle,
        .dash-courses-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.66rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.84rem;
          font-weight: 500;
          border-left: 3px solid transparent;
        }
        .dash-users-toggle-left,
        .dash-courses-toggle-left {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dash-users-dropdown.active .dash-users-toggle,
        .dash-courses-dropdown.active .dash-courses-toggle {
          border-left-color: #2563eb;
          background: rgba(37, 99, 235, 0.08);
          color: #0f172a;
        }
        .dash-users-submenu,
        .dash-courses-submenu {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-left: 0.7rem;
        }
        .dash-users-submenu .dash-nav-link,
        .dash-courses-submenu .dash-nav-link {
          padding-left: 1.78rem;
        }
        .dash-users-chevron,
        .dash-courses-chevron {
          transition: transform 0.2s ease;
        }
        .dash-users-chevron.open,
        .dash-courses-chevron.open {
          transform: rotate(180deg);
        }
        .dash-footer {
          padding-top: 0.75rem;
        }
        .dash-logout {
          width: 100%;
          justify-content: flex-start;
        }
        .dash-main {
          flex: 1;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          margin-left: var(--sidebar-width);
        }
        .dash-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.72rem 1rem;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .dash-topbar-main {
          display: inline-flex;
          align-items: center;
          gap: 0.72rem;
          min-width: 0;
        }
        .dash-topbar-copy {
          display: inline-flex;
          flex-direction: column;
          min-width: 0;
        }
        .dash-topbar-copy strong {
          color: var(--heading);
          font-size: 0.88rem;
          line-height: 1.15;
        }
        .dash-topbar-copy span {
          color: var(--muted);
          font-size: 0.7rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 42vw;
        }
        .dash-topbar-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .dash-back {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.84rem;
          font-family: inherit;
        }
        .dash-user-name {
          font-size: 0.8rem;
        }
        .dash-topbar-logout {
          min-height: 34px;
          padding: 0.36rem 0.62rem;
        }
        .dash-content {
          padding: clamp(0.78rem, 1.8vw, 1.1rem) clamp(0.82rem, 1.9vw, 1.2rem) 1.3rem;
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .dash-mobile-toggle {
          display: none;
          position: fixed;
          top: 0.85rem;
          left: 0.85rem;
          z-index: 30;
          border-radius: 9px;
          padding: 0.42rem;
          cursor: pointer;
        }
        .dash-overlay {
          display: none;
        }
        @media (max-width: 900px) {
          .dash-mobile-toggle {
            display: flex;
          }
          .dash-sidebar {
            position: fixed;
            z-index: 20;
            left: 0;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            box-shadow: 8px 0 24px rgba(29, 53, 87, 0.25);
          }
          .dash-sidebar.open {
            transform: translateX(0);
          }
          .dash-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(26, 42, 76, 0.45);
            z-index: 15;
          }
          .dash-main {
            width: 100%;
            margin-left: 0;
          }
          .dash-topbar {
            padding-left: 3.2rem;
          }
          .dash-topbar-copy span {
            max-width: 48vw;
          }
        }
        @media (max-width: 700px) {
          .dash-topbar-main {
            align-items: flex-start;
            flex-direction: column;
            gap: 0.4rem;
          }
          .dash-topbar {
            align-items: flex-start;
            flex-direction: column;
          }
          .dash-topbar-actions {
            width: 100%;
          }
          .dash-topbar-logout {
            margin-left: auto;
          }
          .dash-user-name {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
