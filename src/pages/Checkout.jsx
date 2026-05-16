import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CreditCard,
  PlayCircle,
  RefreshCw,
  Shield,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { resolveMediaUrl } from '../utils/mediaUrl';
import './Checkout.css';

const FALLBACK = '/placeholder-course.svg';

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
}

const PAYMENT_METHODS = [
  { id: 'evc_plus',      label: 'EVC Plus',       icon: '📱', desc: 'Hormuud EVC Plus' },
  { id: 'sahal',         label: 'Sahal',          icon: '💳', desc: 'Salaam Bank Sahal' },
  { id: 'zaad',          label: 'Zaad',           icon: '📲', desc: 'Telesom Zaad' },
  { id: 'cash',          label: 'Cash',           icon: '💵', desc: 'Pay at our office' },
  { id: 'bank_transfer', label: 'Bank Transfer',  icon: '🏦', desc: 'Bank wire transfer' },
];

const STEPS = ['Choose Payment', 'Submit Proof', 'Confirmed'];

export function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('evc_plus');
  const [transactionId, setTransactionId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPaid = useMemo(() => {
    if (!course) return false;
    if (String(course.pricing_type || '').toLowerCase() === 'paid') return true;
    return getCoursePrice(course) > 0;
  }, [course]);

  async function loadEnrollment() {
    try {
      const { data } = await api.get(`/enrollments/course/${courseId}/mine`);
      setEnrollment(data);
      setTransactionId(data.transaction_id || '');
      setProofUrl(data.payment_proof_url || '');
      if (data.status === 'approved') setStep(3);
      else if (data._id) setStep(2);
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
      const { data } = await api.post('/enrollments', {
        course_id: courseId,
        payment_method: paymentMethod,
      });
      setEnrollment(data.enrollment);
      toast.success(data.message || 'Enrollment created');
      if (data.enrollment?.status === 'approved') {
        setStep(3);
      } else {
        setStep(2);
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
        toast.success('Payment screenshot uploaded');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  async function submitProof() {
    if (!enrollment?._id) return;
    if (!proofUrl && !transactionId.trim()) {
      toast.error('Upload a screenshot or enter a transaction ID');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.patch(`/enrollments/${enrollment._id}/payment-proof`, {
        payment_proof_url: proofUrl,
        transaction_id: transactionId,
      });
      setEnrollment(data.enrollment);
      toast.success('Payment proof submitted — awaiting verification');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit payment proof');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !course) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <RefreshCw size={24} style={{ animation: 'ck-spin 0.8s linear infinite', color: '#1d3557' }} />
      </div>
    );
  }

  const displayPrice = getCoursePrice(course);
  const hasSale = displayPrice < Number(course.price || 0);
  const thumb = resolveMediaUrl(course.thumbnail) || FALLBACK;
  const currentStep = enrollment?.status === 'approved' ? 3 : step;

  return (
    <div className="ck-shell">
      <style>{`
        @keyframes ck-spin { to { transform: rotate(360deg); } }
        .ck-shell { min-height: 100vh; background: #f1f5f9; }
        .ck-inner { max-width: 960px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
        .ck-back { display: inline-flex; align-items: center; gap: 0.4rem; color: #64748b; text-decoration: none; font-size: 0.86rem; font-weight: 600; margin-bottom: 1.25rem; transition: color 0.15s; }
        .ck-back:hover { color: #1d3557; }
        .ck-stepper { display: flex; align-items: center; gap: 0; margin-bottom: 2rem; }
        .ck-step { display: flex; align-items: center; gap: 0.5rem; flex: 1; }
        .ck-step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; flex-shrink: 0; transition: all 0.25s; }
        .ck-step-num.done { background: #16a34a; color: #fff; }
        .ck-step-num.active { background: #1d3557; color: #fff; }
        .ck-step-num.pending { background: #e2e8f0; color: #94a3b8; }
        .ck-step-label { font-size: 0.82rem; font-weight: 600; }
        .ck-step-label.active { color: #1d3557; }
        .ck-step-label.done { color: #16a34a; }
        .ck-step-label.pending { color: #94a3b8; }
        .ck-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 0.5rem; }
        .ck-step-line.done { background: #16a34a; }
        .ck-grid { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start; }
        .ck-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(29,53,87,0.06); }
        .ck-card-head { padding: 1.4rem 1.5rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .ck-card-head h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1d3557; display: flex; align-items: center; gap: 0.5rem; }
        .ck-card-head p { margin: 0.4rem 0 0; font-size: 0.85rem; color: #64748b; }
        .ck-card-body { padding: 1.4rem 1.5rem 1.5rem; }
        .ck-pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 1.5rem; }
        .ck-pm-option { border: 2px solid #e2e8f0; border-radius: 10px; padding: 0.8rem 0.9rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; display: flex; align-items: center; gap: 0.6rem; }
        .ck-pm-option:hover { border-color: #94a3b8; }
        .ck-pm-option.selected { border-color: #1d3557; background: #eff6ff; }
        .ck-pm-option input[type=radio] { display: none; }
        .ck-pm-icon { font-size: 1.4rem; }
        .ck-pm-label { font-size: 0.88rem; font-weight: 700; color: #1e293b; line-height: 1.2; }
        .ck-pm-desc { font-size: 0.75rem; color: #94a3b8; }
        .ck-instr-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1.25rem; }
        .ck-instr-box strong { color: #0369a1; font-size: 0.88rem; }
        .ck-instr-box ul { margin: 0.5rem 0 0; padding-left: 1.1rem; color: #0c4a6e; font-size: 0.85rem; line-height: 1.7; }
        .ck-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .ck-label { font-size: 0.86rem; font-weight: 600; color: #374151; }
        .ck-input { height: 42px; padding: 0 0.85rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.15s; width: 100%; box-sizing: border-box; }
        .ck-input:focus { border-color: #1d3557; }
        .ck-btn-primary { height: 48px; background: #1d3557; color: #fff; border: none; border-radius: 10px; font-size: 0.97rem; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; transition: background 0.15s; }
        .ck-btn-primary:hover:not(:disabled) { background: #162944; }
        .ck-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .ck-btn-secondary { height: 44px; background: #fff; color: #1d3557; border: 2px solid #d1d5db; border-radius: 10px; font-size: 0.9rem; font-weight: 700; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; transition: border-color 0.15s; }
        .ck-btn-secondary:hover { border-color: #1d3557; }
        .ck-proof-row { display: flex; gap: 0.6rem; margin-bottom: 1rem; }
        .ck-success-screen { padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .ck-success-icon { color: #16a34a; }
        .ck-success-screen h2 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #1d3557; }
        .ck-success-screen p { margin: 0; font-size: 0.9rem; color: #64748b; }
        .ck-success-btns { display: flex; gap: 0.65rem; margin-top: 0.5rem; justify-content: center; flex-wrap: wrap; }
        .ck-status-pending { display: inline-flex; align-items: center; gap: 0.35rem; background: #fef3c7; color: #92400e; border-radius: 20px; padding: 0.3rem 0.8rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ck-status-pv { background: #dbeafe; color: #1d4ed8; display: inline-flex; align-items: center; border-radius: 20px; padding: 0.3rem 0.8rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ck-status-rejected { background: #fee2e2; color: #b91c1c; display: inline-flex; align-items: center; border-radius: 20px; padding: 0.3rem 0.8rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ck-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; background: #e2e8f0; }
        .ck-summary-course { margin-bottom: 1.25rem; }
        .ck-summary-course h3 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 800; color: #1d3557; line-height: 1.3; }
        .ck-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-top: 1px solid #f1f5f9; font-size: 0.86rem; color: #64748b; }
        .ck-summary-row strong { color: #1e293b; }
        .ck-total-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0 0; border-top: 2px solid #e2e8f0; margin-top: 0.25rem; }
        .ck-total-row span { font-size: 0.9rem; font-weight: 700; color: #374151; }
        .ck-total-row strong { font-size: 1.4rem; font-weight: 800; color: #1d3557; }
        .ck-old-price { font-size: 0.85rem; text-decoration: line-through; color: #94a3b8; margin-left: 0.4rem; }
        .ck-trust { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: #64748b; margin-top: 1rem; justify-content: center; }
        @media (max-width: 680px) {
          .ck-grid { grid-template-columns: 1fr; }
          .ck-pm-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="ck-inner">
        <Link to={`/courses/${courseId}`} className="ck-back">
          <ArrowLeft size={17} /> Back to course
        </Link>

        {/* Step indicator */}
        <div className="ck-stepper">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const state = num < currentStep ? 'done' : num === currentStep ? 'active' : 'pending';
            return (
              <div key={label} className="ck-step">
                <div className={`ck-step-num ${state}`}>
                  {state === 'done' ? <CheckCircle2 size={14} /> : num}
                </div>
                <span className={`ck-step-label ${state}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`ck-step-line ${num < currentStep ? 'done' : ''}`} />}
              </div>
            );
          })}
        </div>

        <div className="ck-grid">
          {/* Main section */}
          <div className="ck-card">
            {/* ── STEP 1: Choose payment method ── */}
            {currentStep === 1 && (
              <>
                <div className="ck-card-head">
                  <h2><CreditCard size={18} /> Choose Payment Method</h2>
                  <p>Select how you will pay for this course.</p>
                </div>
                <div className="ck-card-body">
                  <div className="ck-pm-grid">
                    {PAYMENT_METHODS.map((pm) => (
                      <label key={pm.id} className={`ck-pm-option ${paymentMethod === pm.id ? 'selected' : ''}`}>
                        <input type="radio" name="pm" value={pm.id} checked={paymentMethod === pm.id} onChange={() => setPaymentMethod(pm.id)} />
                        <span className="ck-pm-icon">{pm.icon}</span>
                        <div>
                          <div className="ck-pm-label">{pm.label}</div>
                          <div className="ck-pm-desc">{pm.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {!isPaid ? (
                    <button type="button" className="ck-btn-primary" onClick={enrollNow} disabled={submitting}>
                      {submitting ? <RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> : <BadgeCheck size={16} />}
                      {submitting ? 'Enrolling…' : 'Enroll for Free'}
                    </button>
                  ) : (
                    <button type="button" className="ck-btn-primary" onClick={enrollNow} disabled={submitting}>
                      {submitting ? <RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> : <CreditCard size={16} />}
                      {submitting ? 'Processing…' : `Proceed — $${displayPrice.toFixed(2)}`}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2: Submit payment proof ── */}
            {currentStep === 2 && enrollment && (
              <>
                <div className="ck-card-head">
                  <h2><Upload size={18} /> Submit Payment Proof</h2>
                  <p>Upload a screenshot or enter your transaction ID to verify payment.</p>
                </div>
                <div className="ck-card-body">
                  {enrollment.status === 'pending' && <div className="ck-status-pending">⏳ Pending payment proof</div>}
                  {enrollment.status === 'pending_verification' && <div className="ck-status-pv">🔍 Under review — we'll notify you shortly</div>}
                  {enrollment.status === 'rejected' && <div className="ck-status-rejected">✕ Payment rejected — please resubmit</div>}

                  {isPaid && enrollment.status !== 'approved' && (
                    <>
                      <div className="ck-instr-box">
                        <strong>Payment Instructions</strong>
                        <ul>
                          <li><strong>EVC Plus / Zaad / Sahal:</strong> Send to merchant account and save the receipt</li>
                          <li><strong>Cash:</strong> Pay at SSI office, get a receipt</li>
                          <li><strong>Bank Transfer:</strong> Use your full name as reference</li>
                          <li>Upload your payment screenshot or enter the transaction ID below</li>
                        </ul>
                      </div>

                      <div className="ck-field">
                        <label className="ck-label">Transaction ID <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                        <input className="ck-input" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. TRX123456" />
                      </div>

                      <div className="ck-proof-row">
                        <button type="button" className="ck-btn-secondary" onClick={uploadProof} disabled={uploading} style={{ flex: 1 }}>
                          {uploading ? <RefreshCw size={15} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> : <Upload size={15} />}
                          {uploading ? 'Uploading…' : 'Upload Screenshot'}
                        </button>
                        {proofUrl && (
                          <a href={proofUrl} target="_blank" rel="noreferrer" className="ck-btn-secondary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                            View Uploaded
                          </a>
                        )}
                      </div>

                      <button type="button" className="ck-btn-primary" onClick={submitProof} disabled={submitting} style={{ marginTop: '0.5rem' }}>
                        {submitting ? <RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> : <Shield size={16} />}
                        {submitting ? 'Submitting…' : 'Submit for Verification'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 3: Confirmed ── */}
            {currentStep === 3 && (
              <div className="ck-success-screen">
                <CheckCircle2 size={64} strokeWidth={1.5} className="ck-success-icon" />
                <h2>You're enrolled!</h2>
                <p>Your enrollment for <strong>{course.title}</strong> has been confirmed.</p>
                <div className="ck-success-btns">
                  <Link to={`/watch/${courseId}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    background: '#1d3557', color: '#fff', borderRadius: '10px',
                    padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  }}>
                    <PlayCircle size={17} /> Start Learning
                  </Link>
                  <Link to="/student/courses" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    background: '#fff', color: '#1d3557', border: '2px solid #d1d5db',
                    borderRadius: '10px', padding: '0.72rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none',
                  }}>
                    My Courses
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — order summary */}
          <div>
            <div className="ck-card">
              <img src={thumb} alt={course.title} className="ck-thumb" onError={(e) => { e.target.src = FALLBACK; }} />
              <div className="ck-card-body">
                <div className="ck-summary-course">
                  <h3>{course.title}</h3>
                  <div className="ck-summary-row">
                    <span>Access</span>
                    <strong>Lifetime</strong>
                  </div>
                  <div className="ck-summary-row">
                    <span>Billing</span>
                    <strong>One-time</strong>
                  </div>
                  <div className="ck-summary-row">
                    <span>Payment</span>
                    <strong>{PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || '—'}</strong>
                  </div>
                </div>
                <div className="ck-total-row">
                  <span>Total</span>
                  <div>
                    <strong>${displayPrice.toFixed(2)}</strong>
                    {hasSale && <span className="ck-old-price">${Number(course.price).toFixed(2)}</span>}
                  </div>
                </div>
                <div className="ck-trust">
                  <Shield size={14} />
                  Secure · Manual verification
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
