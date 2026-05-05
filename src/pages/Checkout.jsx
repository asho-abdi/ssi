import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import './Checkout.css';

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
}

export function Checkout() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPaid = useMemo(() => {
    if (!course) return false;
    if (String(course.pricing_type || '').toLowerCase() === 'paid') return true;
    return getCoursePrice(course) > 0;
  }, [course]);

  function statusMeta(status) {
    const key = String(status || '').toLowerCase();
    if (key === 'approved') return { label: 'Approved', className: 'approved' };
    if (key === 'pending_verification') return { label: 'Pending Verification', className: 'pending-verification' };
    if (key === 'rejected') return { label: 'Rejected', className: 'rejected' };
    return { label: 'Pending', className: 'pending' };
  }

  async function loadEnrollment() {
    try {
      const { data } = await api.get(`/enrollments/course/${courseId}/mine`);
      setEnrollment(data);
      setTransactionId(data.transaction_id || '');
      setProofUrl(data.payment_proof_url || '');
    } catch {
      setEnrollment(null);
    }
  }

  useEffect(() => {
    Promise.all([api.get(`/courses/${courseId}`), loadEnrollment()])
      .then(([res]) => setCourse(res.data))
      .catch(() => toast.error('Course not found'))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function enrollNow() {
    setSubmitting(true);
    try {
      const { data } = await api.post('/enrollments', { course_id: courseId });
      setEnrollment(data.enrollment);
      toast.success(data.message || 'Enrollment created');
      if (data.enrollment?.status === 'approved') {
        window.location.href = `/watch/${courseId}`;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not enroll');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadProof() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploading(true);
      const fd = new FormData();
      fd.append('image', file);
      try {
        const { data } = await api.post('/uploads/images', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProofUrl(data.url || '');
        toast.success('Payment proof uploaded');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  async function submitProof() {
    if (!enrollment?._id) {
      toast.error('Please enroll first');
      return;
    }
    if (!proofUrl && !transactionId.trim()) {
      toast.error('Upload payment proof or provide a transaction ID');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/enrollments/${enrollment._id}/payment-proof`, {
        payment_proof_url: proofUrl,
        transaction_id: transactionId,
      });
      setEnrollment(data.enrollment);
      toast.success(data.message || 'Payment proof submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit payment proof');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !course) {
    return (
      <div className="page-shell">
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    );
  }
  const displayPrice = getCoursePrice(course);
  const hasSale = displayPrice < Number(course.price || 0);
  const status = statusMeta(enrollment?.status);

  return (
    <div className="checkout-shell">
      <div className="checkout-inner">
        <Link to={`/courses/${courseId}`} className="checkout-back">
          <ArrowLeft size={17} strokeWidth={2.25} aria-hidden />
          Back to course
        </Link>

        <div className="checkout-grid">
          <section className="checkout-card">
            <div className="checkout-summary-top">
              <span className="checkout-summary-title">
                <CreditCard size={18} strokeWidth={2.2} aria-hidden />
                Order summary
              </span>
            </div>
            <div className="checkout-summary-body">
              <div className="checkout-course">
                <h2>{course.title}</h2>
                <div className="checkout-row">
                  <span>Access</span>
                  <strong>Lifetime</strong>
                </div>
                <div className="checkout-row">
                  <span>Billing</span>
                  <strong>One-time</strong>
                </div>
              </div>
              <div className="checkout-amount">
                <span>Total</span>
                <strong>${displayPrice.toFixed(2)}</strong>
                {hasSale && <small style={{ marginLeft: '0.5rem', textDecoration: 'line-through' }}>${Number(course.price).toFixed(2)}</small>}
              </div>
              <p className="checkout-note">{isPaid ? 'Manual payment verification is enabled for this course.' : 'This course is free.'}</p>
            </div>
          </section>

          <section className="checkout-card">
            <div className="checkout-form-top">
              <h2>
                <AlertCircle size={18} strokeWidth={2.2} aria-hidden />
                Enrollment & Payment Verification
              </h2>
              <p>Submit manual payment proof and wait for admin verification.</p>
            </div>
            {!enrollment && (
              <button type="button" className="btn btn-primary" onClick={enrollNow} disabled={submitting}>
                {submitting ? 'Enrolling...' : 'Enroll in course'}
              </button>
            )}

            {enrollment && (
              <>
                <div className={`status-badge ${status.className}`}>{status.label}</div>
                {isPaid && enrollment.status !== 'approved' && (
                  <>
                    <div className="checkout-alert-error" style={{ marginTop: '0.8rem' }}>
                      <strong>Payment instructions</strong>
                      <ul style={{ margin: '0.45rem 0 0', paddingLeft: '1rem' }}>
                        <li>Mobile Money: EVC Plus / Zaad / Sahal to merchant number</li>
                        <li>Bank transfer: use your full name as reference</li>
                        <li>Upload screenshot or provide transaction ID</li>
                      </ul>
                    </div>

                    <label className="label" style={{ marginTop: '0.75rem', display: 'grid', gap: '0.32rem' }}>
                      Transaction ID (optional if screenshot provided)
                      <input className="input" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                    </label>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                      <button type="button" className="btn btn-secondary" onClick={uploadProof} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload payment proof'}
                      </button>
                      {proofUrl && (
                        <a href={proofUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                          View uploaded proof
                        </a>
                      )}
                    </div>
                    <button type="button" className="btn btn-primary" onClick={submitProof} disabled={submitting} style={{ marginTop: '0.75rem' }}>
                      {submitting ? 'Submitting...' : 'Submit for verification'}
                    </button>
                  </>
                )}

                {enrollment.status === 'approved' && (
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to={`/watch/${courseId}`} className="btn btn-primary">
                      Start learning
                    </Link>
                    <Link to="/student/courses" className="btn btn-secondary">
                      Go to dashboard
                    </Link>
                  </div>
                )}

                {enrollment.status === 'rejected' && (
                  <p className="checkout-alert-error" style={{ marginTop: '0.75rem' }}>
                    Payment was rejected. Re-submit a new payment proof.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
      <style>{`
        .status-badge {
          border-radius: 999px;
          padding: 0.2rem 0.7rem;
          font-size: 0.76rem;
          font-weight: 700;
          display: inline-flex;
          width: fit-content;
          margin-top: 0.3rem;
        }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.pending-verification { background: #dbeafe; color: #1d4ed8; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.rejected { background: #fee2e2; color: #b91c1c; }
      `}</style>
    </div>
  );
}
