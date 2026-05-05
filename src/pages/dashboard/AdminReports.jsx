import { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import * as XLSX from 'xlsx';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const REPORT_TYPES = [
  { value: 'enrollments', label: 'Student Enrollments' },
  { value: 'payments', label: 'Payments Amount' },
  { value: 'payment_status', label: 'Payment Status Breakdown' },
];
const TIMING_OPTIONS = {
  daily: [
    { value: 7, label: 'Last 7 days' },
    { value: 14, label: 'Last 14 days' },
    { value: 30, label: 'Last 30 days' },
  ],
  weekly: [
    { value: 4, label: 'Last 4 weeks' },
    { value: 8, label: 'Last 8 weeks' },
    { value: 12, label: 'Last 12 weeks' },
  ],
  monthly: [
    { value: 3, label: 'Last 3 months' },
    { value: 6, label: 'Last 6 months' },
    { value: 12, label: 'Last 12 months' },
  ],
};

const PIE_COLORS = ['#3b82f6', '#f97316', '#14b8a6', '#ef4444', '#a855f7', '#facc15', '#22c55e'];

function PieChart({ segments, currency = false }) {
  const total = segments.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const safeTotal = total > 0 ? total : 1;
  let startAngle = -Math.PI / 2;
  const cx = 170;
  const cy = 170;
  const r = 120;

  const arcs = segments.map((segment, idx) => {
    const value = Number(segment.value || 0);
    const portion = value / safeTotal;
    const endAngle = startAngle + portion * Math.PI * 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const color = PIE_COLORS[idx % PIE_COLORS.length];
    const percent = total > 0 ? (value / total) * 100 : 0;
    startAngle = endAngle;
    return { ...segment, d, color, percent };
  });

  return (
    <div className="ar-pie-layout">
      <svg viewBox="0 0 340 340" className="ar-pie-svg" role="img" aria-label="Report pie chart">
        {arcs.map((arc) => (
          <path key={arc.label} d={arc.d} fill={arc.color} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <div className="ar-pie-legend">
        {arcs.map((arc) => (
          <div className="ar-legend-row" key={`${arc.label}-legend`}>
            <span className="ar-legend-dot" style={{ background: arc.color }} />
            <span className="ar-legend-name">{arc.label}</span>
            <span className="ar-legend-value">
              {currency ? `$${Number(arc.value || 0).toFixed(2)}` : Number(arc.value || 0).toLocaleString()} ({arc.percent.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminReports() {
  const [filters, setFilters] = useState({
    reportType: 'enrollments',
    period: 'daily',
    timing: 14,
    customStart: '',
    customEnd: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    reportType: 'enrollments',
    period: 'daily',
    timing: 14,
    customStart: '',
    customEnd: '',
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totals: { enrollments: 0, payments: 0 }, points: [], status_breakdown: [] });
  const [auditRows, setAuditRows] = useState([]);
  const [quizAnalytics, setQuizAnalytics] = useState({ totals: {}, quizzes: [], lessons: [] });

  useEffect(() => {
    const first = TIMING_OPTIONS[filters.period]?.[0]?.value;
    if (!first) return;
    if (!TIMING_OPTIONS[filters.period].some((x) => x.value === filters.timing)) {
      setFilters((prev) => ({ ...prev, timing: first }));
    }
  }, [filters.period, filters.timing]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const hasCustom = Boolean(appliedFilters.customStart && appliedFilters.customEnd);
    api
      .get('/stats/admin/report', {
        params: {
          period: appliedFilters.period,
          points: appliedFilters.timing,
          ...(hasCustom
            ? { start_date: appliedFilters.customStart, end_date: appliedFilters.customEnd }
            : {}),
        },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data || { totals: { enrollments: 0, payments: 0 }, points: [], status_breakdown: [] });
      })
      .catch(() => {
        if (!cancelled) setData({ totals: { enrollments: 0, payments: 0 }, points: [], status_breakdown: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/audit-logs', { params: { limit: 15 } })
      .then((res) => {
        if (cancelled) return;
        setAuditRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
      })
      .catch(() => {
        if (!cancelled) setAuditRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/stats/admin/in-video-quiz-analytics')
      .then((res) => {
        if (cancelled) return;
        setQuizAnalytics(res.data || { totals: {}, quizzes: [], lessons: [] });
      })
      .catch(() => {
        if (!cancelled) setQuizAnalytics({ totals: {}, quizzes: [], lessons: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const points = useMemo(() => (Array.isArray(data.points) ? data.points : []), [data.points]);
  const statusBreakdown = useMemo(
    () => (Array.isArray(data.status_breakdown) ? data.status_breakdown : []),
    [data.status_breakdown]
  );

  const pieSegments = useMemo(() => {
    if (appliedFilters.reportType === 'payments') {
      return points.map((p) => ({ label: p.label, value: Number(p.payments || 0) })).filter((x) => x.value > 0);
    }
    if (appliedFilters.reportType === 'payment_status') {
      return statusBreakdown.map((row) => ({
        label: String(row.status || '').replace('_', ' ').toUpperCase(),
        value: Number(row.count || 0),
      }));
    }
    return points.map((p) => ({ label: p.label, value: Number(p.enrollments || 0) })).filter((x) => x.value > 0);
  }, [appliedFilters.reportType, points, statusBreakdown]);

  const isCurrencyPie = appliedFilters.reportType === 'payments';

  function applyFilters() {
    if (filters.customStart && filters.customEnd && filters.customStart > filters.customEnd) return;
    setAppliedFilters(filters);
  }

  function exportExcel() {
    const reportLabel = REPORT_TYPES.find((x) => x.value === appliedFilters.reportType)?.label || 'Report';
    const rangeLabel =
      appliedFilters.customStart && appliedFilters.customEnd
        ? `${appliedFilters.customStart} to ${appliedFilters.customEnd}`
        : `${appliedFilters.period} (${appliedFilters.timing})`;

    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ['Report', reportLabel],
      ['Period', appliedFilters.period],
      ['Range', rangeLabel],
      ['Generated At', new Date().toISOString()],
      ['Total Enrollments', Number(data.totals?.enrollments || 0)],
      ['Total Payments', Number(data.totals?.payments || 0).toFixed(2)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    if (appliedFilters.reportType === 'payment_status') {
      const rows = statusBreakdown.map((row) => ({
        status: String(row.status || '').replace('_', ' ').toUpperCase(),
        count: Number(row.count || 0),
      }));
      const detailsSheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Payment Status');
    } else {
      const rows = points.map((p) => ({
        label: p.label,
        enrollments: Number(p.enrollments || 0),
        payments: Number(p.payments || 0),
      }));
      const detailsSheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, detailsSheet, 'Details');
    }

    const filename = `admin-report-${appliedFilters.reportType}-${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  function exportInVideoQuizReport() {
    const wb = XLSX.utils.book_new();
    const totalsSheet = XLSX.utils.json_to_sheet([
      {
        attempts: Number(quizAnalytics?.totals?.attempts || 0),
        correct: Number(quizAnalytics?.totals?.correct || 0),
        incorrect: Number(quizAnalytics?.totals?.incorrect || 0),
        skipped: Number(quizAnalytics?.totals?.skipped || 0),
        correct_pct: Number(quizAnalytics?.totals?.correct_pct || 0),
        incorrect_pct: Number(quizAnalytics?.totals?.incorrect_pct || 0),
        skipped_pct: Number(quizAnalytics?.totals?.skipped_pct || 0),
      },
    ]);
    XLSX.utils.book_append_sheet(wb, totalsSheet, 'Totals');
    const quizSheet = XLSX.utils.json_to_sheet(Array.isArray(quizAnalytics?.quizzes) ? quizAnalytics.quizzes : []);
    XLSX.utils.book_append_sheet(wb, quizSheet, 'Per Quiz');
    const lessonSheet = XLSX.utils.json_to_sheet(Array.isArray(quizAnalytics?.lessons) ? quizAnalytics.lessons : []);
    XLSX.utils.book_append_sheet(wb, lessonSheet, 'Per Lesson');
    XLSX.writeFile(wb, `in-video-quiz-analytics-${Date.now()}.xlsx`);
  }

  return (
    <div className="ar-root">
      <div className="ar-head">
        <div>
          <h1>Reports</h1>
          <p className="ar-subtle">Choose report type and timing, then view</p>
        </div>
        <div className="ar-tabs" role="tablist" aria-label="Report period">
          {PERIODS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`ar-tab ${filters.period === opt.value ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, period: opt.value }))}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card ar-filter-row">
        <label className="label">
          Report
          <select className="input" value={filters.reportType} onChange={(e) => setFilters((prev) => ({ ...prev, reportType: e.target.value }))}>
            {REPORT_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Timing
          <select
            className="input"
            value={filters.timing}
            onChange={(e) => setFilters((prev) => ({ ...prev, timing: Number(e.target.value) }))}
          >
            {(TIMING_OPTIONS[filters.period] || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Start date (optional)
          <input
            className="input"
            type="date"
            value={filters.customStart}
            onChange={(e) => setFilters((prev) => ({ ...prev, customStart: e.target.value }))}
          />
        </label>
        <label className="label">
          End date (optional)
          <input
            className="input"
            type="date"
            value={filters.customEnd}
            onChange={(e) => setFilters((prev) => ({ ...prev, customEnd: e.target.value }))}
          />
        </label>
        <div className="ar-filter-action">
          <div className="ar-filter-action-row">
            <button type="button" className="btn btn-primary" onClick={applyFilters}>
              View report
            </button>
            <button type="button" className="btn btn-secondary" onClick={exportExcel}>
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="ar-summary-grid">
        <article className="card ar-summary-card">
          <p>Total Enrollments</p>
          <strong>{Number(data.totals?.enrollments || 0).toLocaleString()}</strong>
        </article>
        <article className="card ar-summary-card">
          <p>Total Payments</p>
          <strong>${Number(data.totals?.payments || 0).toFixed(2)}</strong>
        </article>
      </div>

      {loading ? (
        <p className="ar-subtle">Loading report...</p>
      ) : (
        <div className="ar-charts">
          <section className="card ar-chart-card">
            <h3>
              {appliedFilters.reportType === 'payment_status'
                ? 'Payment Status Chart'
                : appliedFilters.reportType === 'payments'
                  ? 'Payments by Time'
                  : 'Enrollments by Time'}
            </h3>
            {pieSegments.length > 0 ? <PieChart segments={pieSegments} currency={isCurrencyPie} /> : <p className="ar-subtle">No data for selected filters.</p>}
          </section>
        </div>
      )}

      <section className="card ar-chart-card">
        <h3>Recent Audit Logs</h3>
        {auditRows.length === 0 ? (
          <p className="ar-subtle">No audit logs yet.</p>
        ) : (
          <div className="ar-audit-table-wrap">
            <table className="ar-audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((row) => (
                  <tr key={row._id}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>{row.action}</td>
                    <td>{row.actor_id?.name || row.actor_role || 'System'}</td>
                    <td>
                      <span className={`ar-pill ${row.status === 'failed' ? 'is-failed' : 'is-success'}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card ar-chart-card">
        <div className="ar-quiz-head">
          <h3>In-Video Quiz Analytics</h3>
          <button type="button" className="btn btn-secondary" onClick={exportInVideoQuizReport}>
            Export Quiz Report
          </button>
        </div>
        <div className="ar-summary-grid">
          <article className="card ar-summary-card">
            <p>Total Attempts</p>
            <strong>{Number(quizAnalytics?.totals?.attempts || 0).toLocaleString()}</strong>
          </article>
          <article className="card ar-summary-card">
            <p>Correct %</p>
            <strong>{Number(quizAnalytics?.totals?.correct_pct || 0).toFixed(2)}%</strong>
          </article>
          <article className="card ar-summary-card">
            <p>Skipped %</p>
            <strong>{Number(quizAnalytics?.totals?.skipped_pct || 0).toFixed(2)}%</strong>
          </article>
        </div>
        <div className="ar-audit-table-wrap" style={{ marginTop: '0.7rem' }}>
          <table className="ar-audit-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Lesson</th>
                <th>Question</th>
                <th>Attempts</th>
                <th>Correct %</th>
                <th>Skipped %</th>
                <th>Retry Policy</th>
              </tr>
            </thead>
            <tbody>
              {(quizAnalytics?.quizzes || []).slice(0, 50).map((row) => (
                <tr key={row.quiz_id}>
                  <td>{row.course_title}</td>
                  <td>{row.lesson_title}</td>
                  <td>{row.question}</td>
                  <td>{row.attempts}</td>
                  <td>{Number(row.correct_pct || 0).toFixed(2)}%</td>
                  <td>{Number(row.skipped_pct || 0).toFixed(2)}%</td>
                  <td>
                    {row.retry_policy} ({row.max_attempts || 1})
                  </td>
                </tr>
              ))}
              {(quizAnalytics?.quizzes || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="ar-subtle">
                    No popup quiz attempts recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .ar-root {
          display: grid;
          gap: 1rem;
        }
        .ar-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.8rem;
        }
        .ar-head h1 {
          margin: 0;
        }
        .ar-subtle {
          margin: 0.32rem 0 0;
          color: var(--muted);
        }
        .ar-tabs {
          display: inline-flex;
          gap: 0.4rem;
          background: #e2e8f0;
          padding: 0.28rem;
          border-radius: 12px;
        }
        .ar-tab {
          border: none;
          background: transparent;
          color: #334155;
          padding: 0.42rem 0.78rem;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 600;
        }
        .ar-tab.active {
          background: #fff;
          color: #0f172a;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.08);
        }
        .ar-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.8rem;
        }
        .ar-filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.8rem;
          padding: 0.8rem;
        }
        .ar-filter-action {
          display: flex;
          align-items: end;
        }
        .ar-filter-action .btn {
          min-height: 40px;
        }
        .ar-filter-action-row {
          display: flex;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .ar-filter-row .label {
          display: grid;
          gap: 0.35rem;
        }
        .ar-summary-card {
          padding: 1rem;
        }
        .ar-summary-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.85rem;
        }
        .ar-summary-card strong {
          display: block;
          margin-top: 0.35rem;
          font-size: 1.65rem;
          color: #0f172a;
        }
        .ar-charts {
          display: grid;
          gap: 0.9rem;
        }
        .ar-chart-card {
          padding: 1rem;
        }
        .ar-chart-card h3 {
          margin: 0 0 0.7rem;
          color: #1d3557;
        }
        .ar-audit-table-wrap {
          overflow-x: auto;
        }
        .ar-audit-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ar-audit-table th,
        .ar-audit-table td {
          text-align: left;
          padding: 0.55rem 0.6rem;
          border-bottom: 1px solid var(--border);
          font-size: 0.85rem;
        }
        .ar-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.16rem 0.42rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .ar-pill.is-success {
          background: rgba(5, 150, 105, 0.12);
          color: #047857;
        }
        .ar-pill.is-failed {
          background: rgba(220, 38, 38, 0.12);
          color: #b91c1c;
        }
        .ar-pie-layout {
          display: grid;
          grid-template-columns: minmax(260px, 360px) 1fr;
          gap: 1rem;
          align-items: center;
        }
        .ar-quiz-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
        }
        .ar-pie-svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .ar-pie-legend {
          display: grid;
          gap: 0.45rem;
        }
        .ar-legend-row {
          display: grid;
          grid-template-columns: 12px 1fr auto;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        .ar-legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }
        .ar-legend-name {
          color: #1e293b;
          font-weight: 600;
        }
        .ar-legend-value {
          color: #64748b;
          font-weight: 600;
        }
        @media (max-width: 900px) {
          .ar-pie-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
