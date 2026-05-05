import { Bell } from 'lucide-react';
import '../../styles/dashboard-ui.css';

export function DashboardPage({ title, subtitle, actions, children }) {
  return (
    <section className="dash-ui-page">
      <header className="dash-ui-head card card--static">
        <div>
          <h1 className="dash-ui-title">{title}</h1>
          {subtitle ? <p className="dash-ui-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="dash-ui-head-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function SummaryGrid({ children }) {
  return <div className="dash-ui-summary-grid">{children}</div>;
}

export function SummaryCard({ label, value, helper }) {
  return (
    <article className="dash-ui-summary-card card">
      <span className="dash-ui-summary-label">{label}</span>
      <strong className="dash-ui-summary-value">{value}</strong>
      {helper ? <span className="dash-ui-summary-helper">{helper}</span> : null}
    </article>
  );
}

export function SectionCard({ title, subtitle, actions, children }) {
  return (
    <section className="dash-ui-section card card--static">
      {(title || subtitle || actions) && (
        <header className="dash-ui-section-head">
          <div>
            {title ? <h2 className="dash-ui-section-title">{title}</h2> : null}
            {subtitle ? <p className="dash-ui-section-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="dash-ui-section-actions">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="dash-ui-empty card card--static">
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action ? <div className="dash-ui-empty-action">{action}</div> : null}
    </div>
  );
}

export function HeaderBellButton({ onClick, count = 0 }) {
  return (
    <button type="button" className="btn btn-ghost dash-ui-bell-btn" onClick={onClick} aria-label="Notifications">
      <Bell size={18} />
      {count > 0 ? <span className="dash-ui-bell-count">{count > 99 ? '99+' : count}</span> : null}
    </button>
  );
}
