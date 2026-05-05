export function DashboardModal({ open, title, subtitle, onClose, children, footer }) {
  if (!open) return null;

  return (
    <div className="dash-ui-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dash-ui-modal card card--static"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="dash-ui-modal-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose} aria-label="Close modal">
            Close
          </button>
        </header>
        <div className="dash-ui-modal-body">{children}</div>
        {footer ? <footer className="dash-ui-modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
