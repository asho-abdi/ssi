export function DashboardTable({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`dash-ui-table card card--static ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <header className="dash-ui-table-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="dash-ui-table-actions">{actions}</div> : null}
        </header>
      )}
      <div className="dash-ui-table-scroll">{children}</div>
    </section>
  );
}

export function DashboardPagination({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="dash-ui-pagination">
      <button type="button" className="btn btn-secondary" onClick={onPrev} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} / {Math.max(1, totalPages)}
      </span>
      <button type="button" className="btn btn-secondary" onClick={onNext} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}
