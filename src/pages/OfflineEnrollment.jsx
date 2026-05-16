import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronDown } from 'lucide-react';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';

const PAYMENT_METHODS = [
  { value: 'evc_plus', label: 'EVC Plus' },
  { value: 'sahal', label: 'Sahal' },
  { value: 'zaad', label: 'Zaad' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const EMPTY = { fullName: '', email: '', phone: '', courseId: '', schedule: '', paymentMethod: 'cash', notes: '' };

export function OfflineEnrollment() {
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [price, setPrice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then((res) => setCourses(res.data || [])).catch(() => {});
  }, []);

  function onCourseChange(e) {
    const id = e.target.value;
    setForm((f) => ({ ...f, courseId: id }));
    const found = courses.find((c) => c._id === id);
    if (found) {
      const sale = Number(found.sale_price || 0);
      const regular = Number(found.price || 0);
      setPrice(sale > 0 && sale < regular ? sale : regular);
    } else {
      setPrice(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.courseId) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/offline-enrollments', form);
      setSuccess(true);
      setForm(EMPTY);
      setPrice(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="oe-page">
      <header className="oe-header">
        <Link to="/" className="oe-logo-link">
          <SSILogo full />
        </Link>
      </header>

      <main className="oe-main">
        <div className="oe-card">
          <div className="oe-card-top">
            <span className="oe-icon-wrap">
              <BookOpen size={26} strokeWidth={2} />
            </span>
            <h1 className="oe-title">Offline Course Enrollment</h1>
            <p className="oe-subtitle">
              Register for an in-person class at SSI headquarters in Mogadishu.
            </p>
          </div>

          {success ? (
            <div className="oe-success">
              <CheckCircle2 size={48} strokeWidth={1.5} className="oe-success-icon" />
              <h2>Registration Successful!</h2>
              <p>
                You have successfully registered. Please visit the center for payment.
              </p>
              <button
                type="button"
                className="oe-btn-primary"
                onClick={() => setSuccess(false)}
              >
                Register Another
              </button>
              <Link to="/" className="oe-back-link">← Back to home</Link>
            </div>
          ) : (
            <form className="oe-form" onSubmit={onSubmit} noValidate>
              {error && <div className="oe-error-banner">{error}</div>}

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-fullname">Full Name</label>
                <input
                  id="oe-fullname"
                  className="oe-input"
                  type="text"
                  placeholder="e.g. Mohamed Ali"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                />
              </div>

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-email">Email Address</label>
                <input
                  id="oe-email"
                  className="oe-input"
                  type="email"
                  placeholder="e.g. mohamed@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-phone">Phone Number</label>
                <input
                  id="oe-phone"
                  className="oe-input"
                  type="tel"
                  placeholder="e.g. +252 61 5942611"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-course">Select Course</label>
                <div className="oe-select-wrap">
                  <select
                    id="oe-course"
                    className="oe-input oe-select"
                    value={form.courseId}
                    onChange={onCourseChange}
                    required
                  >
                    <option value="">— Choose a course —</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="oe-select-chevron" />
                </div>
              </div>

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-schedule">Preferred Schedule</label>
                <input
                  id="oe-schedule"
                  className="oe-input"
                  type="text"
                  placeholder="e.g. Morning, Weekends, Mon/Wed/Fri"
                  value={form.schedule}
                  onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
                />
              </div>

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-payment">Payment Method</label>
                <div className="oe-payment-grid">
                  {PAYMENT_METHODS.map((pm) => (
                    <label
                      key={pm.value}
                      className={`oe-payment-option ${form.paymentMethod === pm.value ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={pm.value}
                        checked={form.paymentMethod === pm.value}
                        onChange={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                      />
                      {pm.label}
                    </label>
                  ))}
                </div>
              </div>

              {price !== null && (
                <div className="oe-price-display">
                  <span className="oe-price-label">Course fee</span>
                  <span className="oe-price-value">${Number(price).toFixed(2)}</span>
                </div>
              )}

              <div className="oe-field">
                <label className="oe-label" htmlFor="oe-notes">Additional Notes <span style={{fontWeight:400,color:'#94a3b8'}}>(optional)</span></label>
                <textarea
                  id="oe-notes"
                  className="oe-input oe-textarea"
                  rows={3}
                  placeholder="Any special requirements or questions…"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="oe-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Register Now'}
              </button>

              <p className="oe-note">
                Already a member? <Link to="/login">Sign in</Link> to track your courses.
              </p>
            </form>
          )}
        </div>
      </main>

      <style>{`
        .oe-page {
          min-height: 100vh;
          background: #f1f5f9;
          display: flex;
          flex-direction: column;
        }
        .oe-header {
          background: #fff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0.9rem 1.5rem;
          display: flex;
          align-items: center;
        }
        .oe-logo-link {
          text-decoration: none;
        }
        .oe-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
        }
        .oe-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(29, 53, 87, 0.10);
          width: 100%;
          max-width: 480px;
          overflow: hidden;
        }
        .oe-card-top {
          background: linear-gradient(135deg, #1d3557 0%, #2d5f8a 100%);
          padding: 2rem 2rem 1.6rem;
          text-align: center;
          color: #fff;
        }
        .oe-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          margin-bottom: 0.75rem;
        }
        .oe-title {
          font-size: 1.35rem;
          font-weight: 700;
          margin: 0 0 0.4rem;
        }
        .oe-subtitle {
          font-size: 0.88rem;
          opacity: 0.8;
          margin: 0;
          line-height: 1.5;
        }
        .oe-form {
          padding: 1.75rem 2rem 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .oe-error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 8px;
          padding: 0.65rem 0.9rem;
          font-size: 0.88rem;
        }
        .oe-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .oe-label {
          font-size: 0.87rem;
          font-weight: 600;
          color: #374151;
        }
        .oe-input {
          height: 42px;
          padding: 0 0.85rem;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.92rem;
          font-family: inherit;
          color: #1e293b;
          background: #fff;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .oe-input:focus {
          border-color: #1d3557;
          box-shadow: 0 0 0 3px rgba(29, 53, 87, 0.08);
        }
        .oe-select-wrap {
          position: relative;
        }
        .oe-select {
          appearance: none;
          -webkit-appearance: none;
          padding-right: 2.2rem;
          cursor: pointer;
        }
        .oe-select-chevron {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .oe-price-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 0.65rem 1rem;
        }
        .oe-price-label {
          font-size: 0.87rem;
          color: #0369a1;
          font-weight: 500;
        }
        .oe-price-value {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0369a1;
        }
        .oe-payment-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }
        .oe-payment-option {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          padding: 0.5rem 0.65rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s, color 0.15s;
        }
        .oe-payment-option input[type="radio"] { display: none; }
        .oe-payment-option.selected {
          border-color: #1d3557;
          background: #eff6ff;
          color: #1d3557;
          font-weight: 700;
        }
        .oe-payment-option:hover { border-color: #1d3557; }
        .oe-textarea {
          height: auto;
          padding: 0.6rem 0.85rem;
          resize: vertical;
          line-height: 1.55;
        }
        .oe-btn-primary {
          height: 44px;
          background: #1d3557;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 0.25rem;
        }
        .oe-btn-primary:hover:not(:disabled) {
          background: #16293f;
        }
        .oe-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .oe-note {
          text-align: center;
          font-size: 0.83rem;
          color: #64748b;
          margin: 0;
        }
        .oe-note a {
          color: #1d3557;
          font-weight: 600;
          text-decoration: none;
        }
        .oe-success {
          padding: 2.5rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .oe-success-icon {
          color: #16a34a;
        }
        .oe-success h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .oe-success p {
          color: #475569;
          font-size: 0.93rem;
          margin: 0;
          line-height: 1.6;
        }
        .oe-back-link {
          font-size: 0.85rem;
          color: #64748b;
          text-decoration: none;
          margin-top: 0.25rem;
        }
        @media (max-width: 520px) {
          .oe-form { padding: 1.25rem 1.25rem 1.5rem; }
          .oe-card-top { padding: 1.5rem 1.25rem 1.25rem; }
        }
      `}</style>
    </div>
  );
}
