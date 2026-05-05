import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { DashboardPage, SectionCard, SummaryCard, SummaryGrid } from '../../components/dashboard/DashboardUI';

export function TeacherEarnings() {
  const [data, setData] = useState(null);
  const [walletData, setWalletData] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'manual', note: '' });
  const [requesting, setRequesting] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/teacher/earnings'), api.get('/monetization/withdrawals/me')])
      .then(([earningsRes, walletRes]) => {
        setData(earningsRes.data);
        setWalletData(walletRes.data);
      })
      .catch(() => toast.error('Could not load earnings'))
      .finally(() => setWalletLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const rows = Array.isArray(data?.breakdown) ? data.breakdown : [];
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => String(row?.course?.title || '').toLowerCase().includes(q));
  }, [data?.breakdown, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query]);
  const wallet = walletData?.wallet;
  const requests = Array.isArray(walletData?.requests) ? walletData.requests : [];
  const enabledMethods = Object.entries(wallet?.rules?.methods || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
  const minWithdraw = Number(wallet?.rules?.min_amount || 0);
  const available = Number(wallet?.available_balance || 0);
  const canRequestWithdrawal =
    !requesting &&
    Boolean(wallet) &&
    available >= minWithdraw &&
    enabledMethods.length > 0;

  useEffect(() => {
    if (!enabledMethods.length) return;
    if (!enabledMethods.includes(withdrawForm.method)) {
      setWithdrawForm((prev) => ({ ...prev, method: enabledMethods[0] }));
    }
  }, [enabledMethods, withdrawForm.method]);

  async function reloadWallet() {
    try {
      const { data: nextWallet } = await api.get('/monetization/withdrawals/me');
      setWalletData(nextWallet);
    } catch {
      toast.error('Could not refresh wallet');
    }
  }

  async function submitWithdrawal(e) {
    e.preventDefault();
    if (!canRequestWithdrawal) return;
    const amt = Number(String(withdrawForm.amount || '').trim() || 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error('Enter a withdrawal amount greater than zero.');
      return;
    }
    if (amt < minWithdraw) {
      toast.error(`Minimum withdrawal is ${wallet?.currency || 'USD'} ${minWithdraw.toFixed(2)}.`);
      return;
    }
    if (amt > available) {
      toast.error('Amount cannot exceed your available balance.');
      return;
    }
    setRequesting(true);
    try {
      await api.post('/monetization/withdrawals', {
        amount: amt,
        method: withdrawForm.method,
        note: withdrawForm.note,
      });
      setWithdrawForm((prev) => ({ ...prev, amount: '', note: '' }));
      toast.success('Withdrawal request submitted');
      await reloadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit request');
    } finally {
      setRequesting(false);
    }
  }

  function formatMethod(method) {
    if (method === 'manual') return 'Manual (admin payout)';
    if (method === 'bank_transfer') return 'Bank Transfer';
    if (method === 'e_check') return 'E-Check';
    if (method === 'paypal') return 'PayPal';
    return method;
  }

  if (!data || walletLoading) {
    return (
      <DashboardPage title="Earnings" subtitle="Revenue and performance overview">
        <SectionCard>
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        </SectionCard>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage title="Earnings" subtitle="Track revenue, sales, and top-performing courses">
      <SummaryGrid>
        <SummaryCard label="Total Instructor Earnings" value={`$${Number(data.total_revenue).toFixed(2)}`} />
        <SummaryCard label="Platform Share" value={`$${Number(data.platform_earnings || 0).toFixed(2)}`} />
        <SummaryCard label="Total Sales" value={Number(data.orders_count || 0)} />
        <SummaryCard
          label="Courses With Sales"
          value={Array.isArray(data.breakdown) ? data.breakdown.length : 0}
          helper={`Your rate: ${Number(data.instructor_percentage || 0)}% per sale`}
        />
      </SummaryGrid>

      <SectionCard title="Wallet" subtitle="Request withdrawals based on admin rules">
        <div className="earn-wallet-grid">
          <div className="card card--static earn-wallet-card">
            <p>Total Earnings</p>
            <strong>
              {wallet?.currency || 'USD'} {Number(wallet?.total_earnings || 0).toFixed(2)}
            </strong>
          </div>
          <div className="card card--static earn-wallet-card">
            <p>Pending Balance</p>
            <strong>
              {wallet?.currency || 'USD'} {Number(wallet?.pending_balance || 0).toFixed(2)}
            </strong>
          </div>
          <div className="card card--static earn-wallet-card">
            <p>Available Balance</p>
            <strong>
              {wallet?.currency || 'USD'} {Number(wallet?.available_balance || 0).toFixed(2)}
            </strong>
          </div>
        </div>

        <div className="earn-withdraw-note">
          Minimum withdrawal: {wallet?.currency || 'USD'} {Number(wallet?.rules?.min_amount || 0).toFixed(2)} · Hold time:{' '}
          {Number(wallet?.rules?.hold_days || 0)} days
        </div>
        {enabledMethods.length === 0 && (
          <p className="earn-withdraw-warning">No withdrawal method is enabled by admin yet.</p>
        )}
        {!canRequestWithdrawal && enabledMethods.length > 0 && (
          <p className="earn-withdraw-warning">
            You can request only when available balance reaches at least {wallet?.currency || 'USD'}{' '}
            {Number(wallet?.rules?.min_amount || 0).toFixed(2)}.
          </p>
        )}

        <form className="earn-withdraw-form" onSubmit={submitWithdrawal}>
          <label className="label">
            Amount
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </label>
          <label className="label">
            Withdraw Method
            <select
              className="input"
              value={withdrawForm.method}
              onChange={(e) => setWithdrawForm((prev) => ({ ...prev, method: e.target.value }))}
            >
              {enabledMethods.map((method) => (
                <option key={method} value={method}>
                  {formatMethod(method)}
                </option>
              ))}
            </select>
          </label>
          <label className="label earn-withdraw-note-field">
            Notes (optional)
            <textarea
              className="input"
              rows={3}
              value={withdrawForm.note}
              onChange={(e) => setWithdrawForm((prev) => ({ ...prev, note: e.target.value }))}
              placeholder="Any payout details or message for admin"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={!canRequestWithdrawal}>
            {requesting ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </form>

        <div className="table-wrap earn-wd-history-wrap">
          <table className="data-table earn-wd-history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row._id}>
                  <td>{new Date(row.createdAt || Date.now()).toLocaleDateString()}</td>
                  <td>
                    {wallet?.currency || 'USD'} {Number(row.amount || 0).toFixed(2)}
                  </td>
                  <td>{formatMethod(row.method)}</td>
                  <td>
                    <span className={`earn-status earn-status-${row.status}`}>{row.status}</span>
                  </td>
                  <td>{row.note || '—'}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="earn-empty-cell">No withdrawal requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard
        title="Earnings By Course"
        subtitle="Use search and pagination to handle large catalogs"
        actions={
          <input
            className="input earn-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search course..."
          />
        }
      >
        <ul className="earn-list">
          {pageItems.map((b) => (
            <li key={b.course._id} className="card card--static earn-item">
              <strong>{b.course.title}</strong>
              <div className="earn-item-meta">
                {b.sales} sales · You: ${Number(b.revenue).toFixed(2)} · Gross: ${Number(b.gross_revenue || 0).toFixed(2)}
              </div>
            </li>
          ))}
          {pageItems.length === 0 && (
            <li className="card card--static earn-empty">No courses match your search.</li>
          )}
        </ul>
        <div className="earn-pagination">
          <button type="button" className="btn btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
            Previous
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
      </SectionCard>
      <style>{`
        .earn-search {
          min-width: 240px;
        }
        .earn-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .earn-item {
          border-radius: 14px;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.85rem;
        }
        .earn-item-meta {
          color: var(--muted);
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .earn-empty {
          text-align: center;
          color: var(--muted);
        }
        .earn-pagination {
          margin-top: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
        }
        .earn-pagination span {
          color: var(--muted);
          font-size: 0.9rem;
        }
        .earn-wallet-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 0.7rem;
        }
        .earn-wallet-card {
          border-radius: 12px;
          border: 1px solid var(--border);
          padding: 0.75rem;
        }
        .earn-wallet-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.82rem;
        }
        .earn-wallet-card strong {
          display: block;
          margin-top: 0.3rem;
          font-size: 1.08rem;
          color: var(--heading);
        }
        .earn-withdraw-note {
          color: var(--muted);
          font-size: 0.86rem;
          margin-bottom: 0.55rem;
        }
        .earn-withdraw-warning {
          color: #92400e;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 10px;
          padding: 0.45rem 0.6rem;
          margin: 0.4rem 0 0.7rem;
        }
        .earn-withdraw-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.65rem;
          margin-bottom: 0.85rem;
          align-items: end;
        }
        .earn-withdraw-note-field {
          grid-column: 1 / -1;
        }
        .earn-wd-history-wrap {
          overflow: auto;
          border: 1px solid var(--border);
          border-radius: 12px;
        }
        .earn-wd-history-table {
          min-width: 700px;
        }
        .earn-status {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.1rem 0.5rem;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: capitalize;
        }
        .earn-status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        .earn-status-approved {
          background: #dcfce7;
          color: #166534;
        }
        .earn-status-rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        @media (max-width: 780px) {
          .earn-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .earn-search {
            min-width: 0;
            width: 100%;
          }
          .earn-pagination {
            flex-wrap: wrap;
          }
          .earn-wallet-grid {
            grid-template-columns: 1fr;
          }
          .earn-withdraw-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardPage>
  );
}
