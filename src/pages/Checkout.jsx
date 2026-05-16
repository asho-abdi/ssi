import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Lock,
  Mail,
  PlayCircle,
  RefreshCw,
  Shield,
  Upload,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
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
  { id: 'evc_plus',      label: 'EVC Plus',      icon: '📱', desc: 'Hormuud EVC Plus' },
  { id: 'sahal',         label: 'Sahal',         icon: '💳', desc: 'Salaam Bank Sahal' },
  { id: 'zaad',          label: 'Zaad',          icon: '📲', desc: 'Telesom Zaad' },
  { id: 'cash',          label: 'Cash',          icon: '💵', desc: 'Pay at our office' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: 'Bank wire transfer' },
];

function PasswordInput({ value, onChange, placeholder, id }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="ck-input"
        style={{ paddingRight: '2.6rem' }}
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        style={{
          position: 'absolute', right: '0.75rem', top: '50%',
          transform: 'translateY(-50%)', background: 'none', border: 'none',
          cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex',
        }}
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function Checkout() {
  const { courseId } = useParams();
  const { user, register: registerUser, login } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);

  /* step: 1=register, 2=payment-method, 3=submit-proof, 4=confirmed */
  const [step, setStep] = useState(null); // null until we know if user is logged in

  /* registration form */
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [regErrors, setRegErrors] = useState({});
  const [registering, setRegistering] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);

  /* payment */
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

  /* ── load course ── */
  useEffect(() => {
    api.get(`/courses/${courseId}`)
      .then((r) => setCourse(r.data))
      .catch(() => toast.error('Course not found'))
      .finally(() => setLoading(false));
  }, [courseId]);

  /* ── determine starting step once we know auth state ── */
  useEffect(() => {
    if (loading) return;
    if (step !== null) return; // already set
    if (user) {
      loadEnrollment(); // sets step based on enrollment
    } else {
      setStep(1); // not logged in → register first
    }
  }, [loading, user]);

  async function loadEnrollment() {
    try {
      const { data } = await api.get(`/enrollments/course/${courseId}/mine`);
      setEnrollment(data);
      setTransactionId(data.transaction_id || '');
      setProofUrl(data.payment_proof_url || '');
      if (data.status === 'approved') setStep(4);
      else setStep(3);
    } catch {
      setEnrollment(null);
      setStep(2);
    }
  }

  /* ── STEP 1: Register ── */
  function validateReg() {
    const errs = {};
    if (!regForm.name.trim()) errs.name = 'Full name is required';
    if (!regForm.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(regForm.email)) errs.email = 'Enter a valid email';
    if (!regForm.password) errs.password = 'Password is required';
    else if (regForm.password.length < 6) errs.password = 'Minimum 6 characters';
    if (regForm.password !== regForm.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  }

  async function handleRegister(e) {
    e.preventDefault();
    const errs = validateReg();
    if (Object.keys(errs).length) { setRegErrors(errs); return; }
    setRegErrors({});
    setRegistering(true);
    try {
      await registerUser({ name: regForm.name.trim(), email: regForm.email.trim(), password: regForm.password, role: 'student' });
      toast.success('Account created! Proceeding to payment…');
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      if (String(msg).toLowerCase().includes('email')) {
        setRegErrors({ email: msg });
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Signed in!');
      await loadEnrollment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoggingIn(false);
    }
  }

  /* ── STEP 2: Enroll with payment method ── */
  async function enrollNow() {
    setSubmitting(true);
    try {
      const { data } = await api.post('/enrollments', {
        course_id: courseId,
        payment_method: paymentMethod,
      });
      setEnrollment(data.enrollment);
      toast.success(data.message || 'Enrollment created');
      if (data.enrollment?.status === 'approved') setStep(4);
      else setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not enroll');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── STEP 3: Upload proof ── */
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
        const { data } = await api.post('/uploads/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setProofUrl(data.url || '');
        toast.success('Screenshot uploaded');
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
      toast.error(err.response?.data?.message || 'Could not submit proof');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── derived ── */
  const displayPrice = course ? getCoursePrice(course) : 0;
  const hasSale = course ? displayPrice < Number(course.price || 0) : false;
  const thumb = resolveMediaUrl(course?.thumbnail) || FALLBACK;
  const isLoggedIn = Boolean(user);

  const STEPS = isLoggedIn
    ? ['Choose Payment', 'Submit Proof', 'Confirmed']
    : ['Create Account', 'Choose Payment', 'Submit Proof', 'Confirmed'];

  /* step index in the stepper (1-based logical → 0-based index) */
  const stepperIndex = isLoggedIn ? step - 1 : step - 1; // same offset

  if (loading || step === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <RefreshCw size={26} style={{ animation: 'ck-spin 0.8s linear infinite', color: '#1d3557' }} />
      </div>
    );
  }

  return (
    <div className="ck-shell">
      <style>{`
        @keyframes ck-spin { to { transform: rotate(360deg); } }
        .ck-shell { min-height: 100vh; background: #f1f5f9; }
        .ck-inner { max-width: 980px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
        .ck-back { display: inline-flex; align-items: center; gap: 0.4rem; color: #64748b; text-decoration: none; font-size: 0.86rem; font-weight: 600; margin-bottom: 1.25rem; transition: color 0.15s; }
        .ck-back:hover { color: #1d3557; }

        /* ── Stepper ── */
        .ck-stepper { display: flex; align-items: center; margin-bottom: 2rem; }
        .ck-step { display: flex; align-items: center; gap: 0.5rem; }
        .ck-step-num { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; flex-shrink: 0; transition: all 0.25s; }
        .ck-step-num.done   { background: #16a34a; color: #fff; }
        .ck-step-num.active { background: #1d3557; color: #fff; box-shadow: 0 0 0 4px rgba(29,53,87,0.15); }
        .ck-step-num.pending{ background: #e2e8f0; color: #94a3b8; }
        .ck-step-label { font-size: 0.8rem; font-weight: 600; white-space: nowrap; }
        .ck-step-label.active  { color: #1d3557; }
        .ck-step-label.done    { color: #16a34a; }
        .ck-step-label.pending { color: #94a3b8; }
        .ck-step-line { flex: 1; height: 2px; background: #e2e8f0; margin: 0 0.5rem; min-width: 20px; }
        .ck-step-line.done { background: #16a34a; }

        /* ── Layout ── */
        .ck-grid { display: grid; grid-template-columns: 1fr 320px; gap: 1.5rem; align-items: start; }
        .ck-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(29,53,87,0.06); }
        .ck-card-head { padding: 1.4rem 1.5rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .ck-card-head h2 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1d3557; display: flex; align-items: center; gap: 0.5rem; }
        .ck-card-head p  { margin: 0.4rem 0 0; font-size: 0.85rem; color: #64748b; }
        .ck-card-body { padding: 1.4rem 1.5rem 1.5rem; }

        /* ── Form fields ── */
        .ck-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .ck-label { font-size: 0.86rem; font-weight: 600; color: #374151; }
        .ck-label-opt { font-weight: 400; color: #94a3b8; font-size: 0.82rem; }
        .ck-input-wrap { position: relative; display: flex; align-items: center; }
        .ck-input-icon { position: absolute; left: 0.8rem; color: #94a3b8; pointer-events: none; }
        .ck-input {
          height: 44px; padding: 0 0.85rem; border: 1.5px solid #d1d5db; border-radius: 10px;
          font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%; box-sizing: border-box; color: #1e293b; background: #fff;
        }
        .ck-input:focus { border-color: #1d3557; box-shadow: 0 0 0 3px rgba(29,53,87,0.08); }
        .ck-input.with-icon { padding-left: 2.4rem; }
        .ck-input.has-error { border-color: #ef4444; }
        .ck-field-error { font-size: 0.78rem; color: #ef4444; font-weight: 500; }
        .ck-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; }

        /* ── Buttons ── */
        .ck-btn-primary {
          height: 48px; background: #1d3557; color: #fff; border: none; border-radius: 10px;
          font-size: 0.97rem; font-weight: 700; font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; transition: background 0.15s, transform 0.12s;
        }
        .ck-btn-primary:hover:not(:disabled) { background: #162944; transform: translateY(-1px); }
        .ck-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .ck-btn-secondary {
          height: 44px; background: #fff; color: #1d3557; border: 2px solid #d1d5db; border-radius: 10px;
          font-size: 0.9rem; font-weight: 700; font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          width: 100%; transition: border-color 0.15s;
        }
        .ck-btn-secondary:hover { border-color: #1d3557; }

        /* ── Payment methods ── */
        .ck-pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-bottom: 1.5rem; }
        .ck-pm-option { border: 2px solid #e2e8f0; border-radius: 10px; padding: 0.8rem 0.9rem; cursor: pointer; transition: border-color 0.15s, background 0.15s; display: flex; align-items: center; gap: 0.6rem; }
        .ck-pm-option:hover { border-color: #94a3b8; }
        .ck-pm-option.selected { border-color: #1d3557; background: #eff6ff; }
        .ck-pm-option input[type=radio] { display: none; }
        .ck-pm-icon { font-size: 1.4rem; line-height: 1; }
        .ck-pm-label { font-size: 0.88rem; font-weight: 700; color: #1e293b; line-height: 1.2; }
        .ck-pm-desc  { font-size: 0.75rem; color: #94a3b8; }

        /* ── Proof upload ── */
        .ck-instr-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1.25rem; }
        .ck-instr-box strong { color: #0369a1; font-size: 0.88rem; }
        .ck-instr-box ul { margin: 0.5rem 0 0; padding-left: 1.1rem; color: #0c4a6e; font-size: 0.85rem; line-height: 1.7; }
        .ck-proof-row { display: flex; gap: 0.6rem; margin-bottom: 1rem; }

        /* ── Status badges ── */
        .ck-status { display: inline-flex; align-items: center; gap: 0.4rem; border-radius: 20px; padding: 0.3rem 0.85rem; font-size: 0.8rem; font-weight: 700; margin-bottom: 1rem; }
        .ck-status.pending   { background: #fef3c7; color: #92400e; }
        .ck-status.pv        { background: #dbeafe; color: #1d4ed8; }
        .ck-status.rejected  { background: #fee2e2; color: #b91c1c; }

        /* ── Success screen ── */
        .ck-success { padding: 2.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .ck-success h2 { margin: 0; font-size: 1.35rem; font-weight: 800; color: #1d3557; }
        .ck-success p  { margin: 0; font-size: 0.9rem; color: #64748b; }
        .ck-success-btns { display: flex; gap: 0.65rem; justify-content: center; flex-wrap: wrap; margin-top: 0.5rem; }
        .ck-success-link {
          display: inline-flex; align-items: center; gap: 0.45rem;
          border-radius: 10px; padding: 0.72rem 1.4rem; font-weight: 700;
          font-size: 0.9rem; text-decoration: none; transition: opacity 0.15s;
        }
        .ck-success-link:hover { opacity: 0.88; }

        /* ── Divider ── */
        .ck-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0; }
        .ck-divider::before, .ck-divider::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
        .ck-divider span { font-size: 0.78rem; color: #94a3b8; font-weight: 600; white-space: nowrap; }

        /* ── Order summary sidebar ── */
        .ck-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #e2e8f0; }
        .ck-summary-course h3 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 800; color: #1d3557; line-height: 1.3; }
        .ck-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-top: 1px solid #f1f5f9; font-size: 0.86rem; color: #64748b; }
        .ck-summary-row strong { color: #1e293b; }
        .ck-total-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0 0; border-top: 2px solid #e2e8f0; margin-top: 0.25rem; }
        .ck-total-row span { font-size: 0.9rem; font-weight: 700; color: #374151; }
        .ck-total-row strong { font-size: 1.4rem; font-weight: 800; color: #1d3557; }
        .ck-old-price { font-size: 0.85rem; text-decoration: line-through; color: #94a3b8; margin-left: 0.4rem; }
        .ck-trust { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; color: #94a3b8; margin-top: 1rem; }

        /* ── Switch link ── */
        .ck-switch { text-align: center; font-size: 0.84rem; color: #64748b; margin-top: 1rem; }
        .ck-switch a { color: #1d3557; font-weight: 700; text-decoration: none; cursor: pointer; }
        .ck-switch a:hover { text-decoration: underline; }

        /* ── Logged-in greeting ── */
        .ck-user-pill { display: inline-flex; align-items: center; gap: 0.45rem; background: #eff6ff; color: #1d3557; border-radius: 20px; padding: 0.35rem 0.85rem; font-size: 0.82rem; font-weight: 700; margin-bottom: 1.25rem; }

        @media (max-width: 700px) {
          .ck-grid { grid-template-columns: 1fr; }
          .ck-pm-grid { grid-template-columns: 1fr 1fr; }
          .ck-two-col { grid-template-columns: 1fr; }
          .ck-step-label { display: none; }
        }
      `}</style>

      <div className="ck-inner">
        <Link to={`/courses/${courseId}`} className="ck-back">
          <ArrowLeft size={17} /> Back to course
        </Link>

        {/* ── Stepper ── */}
        <div className="ck-stepper">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const state = num < step ? 'done' : num === step ? 'active' : 'pending';
            return (
              <div key={label} className="ck-step" style={{ flex: 1 }}>
                <div className={`ck-step-num ${state}`}>
                  {state === 'done' ? <CheckCircle2 size={14} /> : num}
                </div>
                <span className={`ck-step-label ${state}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`ck-step-line ${num < step ? 'done' : ''}`} />}
              </div>
            );
          })}
        </div>

        <div className="ck-grid">
          {/* ──────────── MAIN PANEL ──────────── */}
          <div className="ck-card">

            {/* ── STEP 1: Create Account ── */}
            {step === 1 && !isLoggedIn && (
              <>
                <div className="ck-card-head">
                  <h2><User size={18} /> Create Your Account</h2>
                  <p>Register for free to enroll in this course.</p>
                </div>
                <div className="ck-card-body">
                  {!showLogin ? (
                    <form onSubmit={handleRegister} noValidate>
                      <div className="ck-field">
                        <label className="ck-label" htmlFor="ck-name">Full Name</label>
                        <div className="ck-input-wrap">
                          <User size={15} className="ck-input-icon" />
                          <input
                            id="ck-name"
                            type="text"
                            className={`ck-input with-icon ${regErrors.name ? 'has-error' : ''}`}
                            placeholder="e.g. Mohamed Ali"
                            value={regForm.name}
                            onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))}
                            autoFocus
                          />
                        </div>
                        {regErrors.name && <span className="ck-field-error">{regErrors.name}</span>}
                      </div>

                      <div className="ck-field">
                        <label className="ck-label" htmlFor="ck-email">Email Address</label>
                        <div className="ck-input-wrap">
                          <Mail size={15} className="ck-input-icon" />
                          <input
                            id="ck-email"
                            type="email"
                            className={`ck-input with-icon ${regErrors.email ? 'has-error' : ''}`}
                            placeholder="you@example.com"
                            value={regForm.email}
                            onChange={(e) => setRegForm((f) => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        {regErrors.email && <span className="ck-field-error">{regErrors.email}</span>}
                      </div>

                      <div className="ck-two-col">
                        <div className="ck-field">
                          <label className="ck-label" htmlFor="ck-pw">Password</label>
                          <PasswordInput
                            id="ck-pw"
                            value={regForm.password}
                            onChange={(e) => setRegForm((f) => ({ ...f, password: e.target.value }))}
                            placeholder="Min. 6 characters"
                          />
                          {regErrors.password && <span className="ck-field-error">{regErrors.password}</span>}
                        </div>
                        <div className="ck-field">
                          <label className="ck-label" htmlFor="ck-cpw">Confirm Password</label>
                          <PasswordInput
                            id="ck-cpw"
                            value={regForm.confirm}
                            onChange={(e) => setRegForm((f) => ({ ...f, confirm: e.target.value }))}
                            placeholder="Repeat password"
                          />
                          {regErrors.confirm && <span className="ck-field-error">{regErrors.confirm}</span>}
                        </div>
                      </div>

                      <button type="submit" className="ck-btn-primary" disabled={registering} style={{ marginTop: '0.5rem' }}>
                        {registering
                          ? <><RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Creating account…</>
                          : <><BadgeCheck size={16} /> Create Account &amp; Continue <ArrowRight size={15} /></>}
                      </button>

                      <div className="ck-divider"><span>Already have an account?</span></div>
                      <button type="button" className="ck-btn-secondary" onClick={() => setShowLogin(true)}>
                        Sign In Instead
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleLogin} noValidate>
                      <div className="ck-field">
                        <label className="ck-label">Email Address</label>
                        <div className="ck-input-wrap">
                          <Mail size={15} className="ck-input-icon" />
                          <input
                            type="email"
                            className="ck-input with-icon"
                            placeholder="you@example.com"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="ck-field">
                        <label className="ck-label">Password</label>
                        <PasswordInput
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                          placeholder="Your password"
                        />
                      </div>
                      <button type="submit" className="ck-btn-primary" disabled={loggingIn} style={{ marginTop: '0.5rem' }}>
                        {loggingIn
                          ? <><RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Signing in…</>
                          : <><Lock size={15} /> Sign In &amp; Continue <ArrowRight size={15} /></>}
                      </button>
                      <div className="ck-divider"><span>Don't have an account?</span></div>
                      <button type="button" className="ck-btn-secondary" onClick={() => setShowLogin(false)}>
                        Create New Account
                      </button>
                    </form>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 2: Choose Payment ── */}
            {step === 2 && (
              <>
                <div className="ck-card-head">
                  <h2><CreditCard size={18} /> Choose Payment Method</h2>
                  <p>Select how you will pay for this course.</p>
                </div>
                <div className="ck-card-body">
                  {isLoggedIn && (
                    <div className="ck-user-pill">
                      <BadgeCheck size={14} /> Signed in as {user.name}
                    </div>
                  )}
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
                      {submitting
                        ? <><RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Enrolling…</>
                        : <><BadgeCheck size={16} /> Enroll for Free</>}
                    </button>
                  ) : (
                    <button type="button" className="ck-btn-primary" onClick={enrollNow} disabled={submitting}>
                      {submitting
                        ? <><RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Processing…</>
                        : <><CreditCard size={16} /> Proceed — ${displayPrice.toFixed(2)} <ArrowRight size={15} /></>}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 3: Submit Payment Proof ── */}
            {step === 3 && enrollment && (
              <>
                <div className="ck-card-head">
                  <h2><Upload size={18} /> Submit Payment Proof</h2>
                  <p>Upload a screenshot or enter your transaction ID to verify payment.</p>
                </div>
                <div className="ck-card-body">
                  {enrollment.status === 'pending' && (
                    <div className="ck-status pending">⏳ Pending payment proof</div>
                  )}
                  {enrollment.status === 'pending_verification' && (
                    <div className="ck-status pv">🔍 Under review — we'll notify you shortly</div>
                  )}
                  {enrollment.status === 'rejected' && (
                    <div className="ck-status rejected">✕ Payment rejected — please resubmit</div>
                  )}

                  {isPaid && enrollment.status !== 'approved' && (
                    <>
                      <div className="ck-instr-box">
                        <strong>Payment Instructions</strong>
                        <ul>
                          <li><strong>EVC Plus / Zaad / Sahal:</strong> Send to our merchant number and save the receipt</li>
                          <li><strong>Cash:</strong> Pay at SSI office and get a receipt</li>
                          <li><strong>Bank Transfer:</strong> Use your full name as the transfer reference</li>
                          <li>Upload your payment screenshot <strong>or</strong> enter the transaction ID below</li>
                        </ul>
                      </div>

                      <div className="ck-field">
                        <label className="ck-label">
                          Transaction ID <span className="ck-label-opt">(optional if screenshot provided)</span>
                        </label>
                        <input
                          className="ck-input"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          placeholder="e.g. TRX123456"
                        />
                      </div>

                      <div className="ck-proof-row">
                        <button type="button" className="ck-btn-secondary" onClick={uploadProof} disabled={uploading} style={{ flex: 1 }}>
                          {uploading
                            ? <><RefreshCw size={15} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Uploading…</>
                            : <><Upload size={15} /> Upload Screenshot</>}
                        </button>
                        {proofUrl && (
                          <a href={proofUrl} target="_blank" rel="noreferrer" className="ck-btn-secondary"
                            style={{ flex: 1, textDecoration: 'none' }}>
                            View Uploaded
                          </a>
                        )}
                      </div>

                      <button type="button" className="ck-btn-primary" onClick={submitProof} disabled={submitting}>
                        {submitting
                          ? <><RefreshCw size={16} style={{ animation: 'ck-spin 0.8s linear infinite' }} /> Submitting…</>
                          : <><Shield size={16} /> Submit for Verification</>}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {/* ── STEP 4: Confirmed ── */}
            {step === 4 && (
              <div className="ck-success">
                <CheckCircle2 size={64} strokeWidth={1.5} color="#16a34a" />
                <h2>You're enrolled!</h2>
                <p>Your enrollment for <strong>{course?.title}</strong> has been confirmed.</p>
                <div className="ck-success-btns">
                  <Link to={`/watch/${courseId}`} className="ck-success-link" style={{ background: '#1d3557', color: '#fff' }}>
                    <PlayCircle size={17} /> Start Learning
                  </Link>
                  <Link to="/student/courses" className="ck-success-link" style={{ background: '#fff', color: '#1d3557', border: '2px solid #d1d5db' }}>
                    My Courses
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ──────────── ORDER SUMMARY SIDEBAR ──────────── */}
          <div className="ck-card">
            <img src={thumb} alt={course?.title} className="ck-thumb" onError={(e) => { e.target.src = FALLBACK; }} />
            <div className="ck-card-body">
              <div className="ck-summary-course">
                <h3>{course?.title}</h3>
                <div className="ck-summary-row">
                  <span>Access</span><strong>Lifetime</strong>
                </div>
                <div className="ck-summary-row">
                  <span>Billing</span><strong>One-time</strong>
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
                <Shield size={13} /> Secure · Manual verification
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
