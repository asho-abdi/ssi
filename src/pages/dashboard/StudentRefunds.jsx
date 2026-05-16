import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const FALLBACK = '/placeholder-course.svg';

const STATUS_META = {
  pending:  { label: 'Pending Review', color: '#b45309', bg: '#fef3c7', icon: <Clock size={13} /> },
  approved: { label: 'Approved',       color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2 size={13} /> },
  rejected: { label: 'Rejected',       color: '#dc2626', bg: '#fee2e2', icon: <XCircle size={13} /> },
  refunded: { label: 'Refunded',       color: '#1d4ed8', bg: '#dbeafe', icon: <DollarSign size={13} /> },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: m.bg, color: m.color, padding: '0.25rem 0.7rem',
      borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

export function StudentRefunds() {
  const [enrollments, setEnrollments] = useState([]);
  const [myRefunds, setMyRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/enrollments/mine'),
      api.get('/refunds/mine'),
    ])
      .then(([eRes, rRes]) => {
        const approved = (eRes.data || []).filter((e) => e.status === 'approved');
        setEnrollments(approved);
        setMyRefunds(rRes.data || []);
      })
      .catch(() => toast.error('Could not load data'))
      .finally(() => setLoading(false));
  }, []);

  const alreadyRequestedIds = new Set(myRefunds.map((r) => String(r.course_id?._id || r.course_id)));

  async function submitRefund(e) {
    e.preventDefault();
    if (!selectedEnrollment || !reason.trim()) {
      toast.error('Please select a course and provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      const enrollment = enrollments.find((en) => en._id === selectedEnrollment);
      const courseId = enrollment?.course_id?._id || enrollment?.course_id;
      const { data } = await api.post('/refunds', { courseId, reason });
      setMyRefunds((prev) => [data, ...prev]);
      toast.success('Refund request submitted');
      setShowForm(false);
      setSelectedEnrollment('');
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit refund request');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading…</div>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '860px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1d3557' }}>Refund Requests</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Request a refund for any of your enrolled courses
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
            background: '#1d3557', color: '#fff', border: 'none', borderRadius: '9px',
            padding: '0.6rem 1.2rem', fontWeight: 700, fontSize: '0.88rem',
            fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <RotateCcw size={15} />
          {showForm ? 'Cancel' : 'Request Refund'}
        </button>
      </div>

      {/* Request Form */}
      {showForm && (
        <div style={{
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '14px',
          padding: '1.5rem', marginBottom: '1.5rem',
          boxShadow: '0 4px 20px rgba(29,53,87,0.07)',
        }}>
          <h2 style={{ margin: '0 0 1.1rem', fontSize: '1rem', fontWeight: 700, color: '#1d3557' }}>
            New Refund Request
          </h2>
          <form onSubmit={submitRefund} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151' }}>Select Course *</label>
              <select
                value={selectedEnrollment}
                onChange={(e) => setSelectedEnrollment(e.target.value)}
                required
                style={{
                  height: '42px', padding: '0 0.85rem', border: '1.5px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                  background: '#fff', cursor: 'pointer',
                }}
              >
                <option value="">— Choose a course —</option>
                {enrollments
                  .filter((en) => !alreadyRequestedIds.has(String(en.course_id?._id || en.course_id)))
                  .map((en) => (
                    <option key={en._id} value={en._id}>
                      {en.course_id?.title || 'Course'}
                    </option>
                  ))}
              </select>
              {enrollments.filter((en) => !alreadyRequestedIds.has(String(en.course_id?._id || en.course_id))).length === 0 && (
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                  All enrolled courses already have refund requests.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, color: '#374151' }}>Reason for Refund *</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Please describe why you are requesting a refund…"
                style={{
                  padding: '0.65rem 0.85rem', border: '1.5px solid #d1d5db', borderRadius: '8px',
                  fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', lineHeight: 1.55,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                height: '44px', background: '#f28c28', color: '#fff', border: 'none', borderRadius: '9px',
                fontWeight: 700, fontSize: '0.92rem', fontFamily: 'inherit', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                opacity: submitting ? 0.65 : 1, alignSelf: 'flex-start', padding: '0 1.5rem',
              }}
            >
              {submitting ? <Clock size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={15} />}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      {/* Refund History */}
      {myRefunds.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
          padding: '3rem', textAlign: 'center', color: '#94a3b8',
        }}>
          <AlertCircle size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.35 }} />
          <p style={{ margin: 0, fontSize: '0.95rem' }}>No refund requests yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {myRefunds.map((r) => {
            const thumb = resolveMediaUrl(r.course_id?.thumbnail) || FALLBACK;
            return (
              <div key={r._id} style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
                padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center',
                gap: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}>
                <img
                  src={thumb}
                  alt=""
                  onError={(e) => { e.target.src = FALLBACK; }}
                  style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: '8px', flexShrink: 0, background: '#e2e8f0' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.course_id?.title || 'Course'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reason}
                  </div>
                  {r.admin_note && (
                    <div style={{ fontSize: '0.8rem', color: '#1d4ed8', marginTop: '0.25rem' }}>
                      Admin: {r.admin_note}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                  <StatusBadge status={r.status} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d3557' }}>
                    ${Number(r.amount || 0).toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
