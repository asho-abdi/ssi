import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { DashboardPage, SectionCard, SummaryCard, SummaryGrid } from '../../components/dashboard/DashboardUI';

export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [more, setMore] = useState({ reviews: 0, certificates: 0 });

  useEffect(() => {
    api.get('/stats/admin').then((res) => setStats(res.data)).catch(() => {});
    Promise.all([
      api.get('/reviews/all').catch(() => ({ data: [] })),
      api.get('/certificates/all').catch(() => ({ data: [] })),
    ]).then(([reviewsRes, certsRes]) => {
      setMore({
        reviews: reviewsRes.data.length || 0,
        certificates: certsRes.data.length || 0,
      });
    });
  }, []);

  if (!stats) {
    return (
      <DashboardPage title="Admin Overview" subtitle="System health and platform metrics">
        <SectionCard>
          <p style={{ color: 'var(--muted)' }}>Loading stats…</p>
        </SectionCard>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage title="Admin Overview" subtitle="Live platform health, growth, and quick actions">
      <SummaryGrid>
        <SummaryCard label="Users" value={stats.users} />
        <SummaryCard label="Courses" value={stats.courses} />
        <SummaryCard label="Paid Orders" value={stats.paid_orders} />
        <SummaryCard label="Gross Sales" value={`$${Number(stats.revenue).toFixed(2)}`} />
        <SummaryCard label="Platform Earnings" value={`$${Number(stats.platform_earnings || 0).toFixed(2)}`} />
        <SummaryCard label="Instructor Payouts" value={`$${Number(stats.instructor_payouts || 0).toFixed(2)}`} />
        <SummaryCard label="Reviews" value={more.reviews} />
        <SummaryCard label="Certificates" value={more.certificates} />
      </SummaryGrid>

      <SectionCard title="Admin Activities" subtitle="Jump into the most common management workflows">
        <div className="activity-grid">
          <Link to="/dashboard/admin/users" className="card activity-card card--static">
            <strong>Users</strong>
            <span>Roles, profile access, reports</span>
          </Link>
          <Link to="/dashboard/admin/courses" className="card activity-card card--static">
            <strong>Courses</strong>
            <span>Curriculum, publish state, quality</span>
          </Link>
          <Link to="/dashboard/admin/payments" className="card activity-card card--static">
            <strong>Payments</strong>
            <span>Transactions and verification status</span>
          </Link>
          <Link to="/dashboard/admin/reports" className="card activity-card card--static">
            <strong>Reports</strong>
            <span>Revenue, enrollments, trend analysis</span>
          </Link>
          <Link to="/dashboard/admin/settings" className="card activity-card card--static">
            <strong>Settings</strong>
            <span>Branding, pricing, and system options</span>
          </Link>
          <Link to="/dashboard/admin/reviews" className="card activity-card card--static">
            <strong>Reviews</strong>
            <span>Moderate student sentiment and ratings</span>
          </Link>
          <Link to="/dashboard/admin/certificates" className="card activity-card card--static">
            <strong>Certificates</strong>
            <span>Templates and completion visibility</span>
          </Link>
        </div>
      </SectionCard>
      <style>{`
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 0.9rem;
        }
        .activity-card {
          text-decoration: none !important;
          color: inherit !important;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          border-radius: 14px;
          border: 1px solid var(--border);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .activity-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(29, 53, 87, 0.1);
          text-decoration: none !important;
        }
        .activity-card span {
          color: var(--muted);
          font-size: 0.88rem;
        }
      `}</style>
    </DashboardPage>
  );
}
