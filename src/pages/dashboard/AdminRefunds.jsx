import { useEffect, useState, useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const STATUS_META = {
  pending:  { label: 'Pending',  color: '#b45309', bg: '#fef3c7', icon: <Clock size={13} /> },
  approved: { label: 'Approved', color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={13} /> },
  refunded: { label: 'Refunded', color: '#1d4ed8', bg: '#dbeafe', icon: <DollarSign size={13} /> },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: m.bg, color: m.color,
      padding: '0.22rem 0.65rem', borderRadius: '20px',
      fontSize: '0.78rem', fontWeight: 700,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

export function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/refunds'),
      api.get('/refunds/stats'),
    ])
      .then(([rRes, sRes]) => {
        setRefunds(rRes.data.refunds || []);
        setStats(sRes.data);
      })
      .catch(() => toast.error('Could not load refunds'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...refunds];
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        String(r.student_id?.name || '').toLowerCase().includes(q) ||
        String(r.student_id?.email || '').toLowerCase().includes(q) ||
        String(r.course_id?.title || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [refunds, statusFilter, search]);

  async function applyAction(status) {
    if (!selected) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/refunds/${selected._id}`, { status, admin_note: adminNote });
      setRefunds((prev) => prev.map((r) => r._id === data._id ? data : r));
      toast.success(`Refund ${status}`);
      setSelected(null);
      setAdminNote('');
      // Refresh stats
      api.get('/refunds/stats').then((r) => setStats(r.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Requests', value: stats?.total ?? '—', color: '#1d3557', bg: '#eff6ff' },
          { label: 'Pending',        value: stats?.pending ?? '—', color: '#b45309', bg: '#fef3c7' },
          { label: 'Approved',       value: stats?.approved ?? '—', color: '#15803d', bg: '#dcfce7' },
          { label: 'Total Refunded', value: stats ? `$${Number(stats.totalRefunded).toFixed(2)}` : '—', color: '#1d4ed8', bg: '#dbeafe' },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: '12px', padding: '1.1rem 1.25rem',
            display: 'flex', flexDirection: 'column', gap: '0.25rem',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: s.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by student or course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              paddingLeft: '2.1rem', paddingRight: '0.75rem', height: '38px',
              border: '1.5px solid #e2e8f0', borderRadius: '8px',
              fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
        {['all', 'pending', 'approved', 'rejected', 'refunded'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '20px', border: '1.5px solid',
              borderColor: statusFilter === s ? '#1d3557' : '#e2e8f0',
              background: statusFilter === s ? '#1d3557' : '#fff',
              color: statusFilter === s ? '#fff' : '#64748b',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {s === 'all' ? 'All' : STATUS_META[s]?.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>Loading refunds…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p>No refund requests found.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Student', 'Course', 'Amount', 'Reason', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '0.8rem 1rem', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r._id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{r.student_id?.name || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{r.student_id?.email}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#374151', maxWidth: 180 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.course_id?.title || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#1d3557' }}>
                    ${Number(r.amount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', maxWidth: 200 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.reason}>
                      {r.reason}
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {r.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => { setSelected(r); setAdminNote(r.admin_note || ''); }}
                        style={{
                          background: '#1d3557', color: '#fff', border: 'none',
                          borderRadius: '7px', padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Review
                      </button>
                    )}
                    {r.status !== 'pending' && (
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {r.reviewed_by?.name ? `By ${r.reviewed_by.name}` : 'Reviewed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '2rem',
            width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1d3557' }}>Review Refund Request</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {selected.student_id?.name} · {selected.course_id?.title}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.25rem' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Student Reason</div>
              <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>{selected.reason}</p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151' }}>Refund Amount</label>
                <span style={{ fontWeight: 800, color: '#1d3557' }}>${Number(selected.amount || 0).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '0.35rem' }}>
                Admin Note <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note for the student…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '0.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.55,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={updating}
                onClick={() => applyAction('approved')}
                style={{
                  flex: 1, height: '42px', background: '#16a34a', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                  fontFamily: 'inherit', cursor: 'pointer', opacity: updating ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                {updating ? <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle2 size={15} />}
                Approve
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => applyAction('rejected')}
                style={{
                  flex: 1, height: '42px', background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                  fontFamily: 'inherit', cursor: 'pointer', opacity: updating ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                <XCircle size={15} />
                Reject
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => applyAction('refunded')}
                style={{
                  flex: 1, height: '42px', background: '#1d4ed8', color: '#fff',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                  fontFamily: 'inherit', cursor: 'pointer', opacity: updating ? 0.65 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                }}
              >
                <DollarSign size={15} />
                Mark Refunded
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
