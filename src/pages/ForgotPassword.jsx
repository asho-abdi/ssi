import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#f7f9fb';
    document.body.style.color = '#1a202c';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      setDevResetUrl(data?.dev_reset_url || '');
      toast.success('Reset instructions generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not process request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page-top">
        <SSILogo className="auth-page-brand" />
      </div>
      <div className="card auth-card">
        <h1>Forgot Password</h1>
        <p className="auth-muted">Enter your email and we will generate a reset link.</p>
        <form onSubmit={onSubmit} className="auth-form">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Generating…' : 'Send reset link'}
          </button>
        </form>
        {submitted ? (
          <div className="auth-note">
            <p>If the email exists, a reset link has been generated.</p>
            {devResetUrl ? (
              <a href={devResetUrl} className="auth-inline-link">
                Open reset link (dev)
              </a>
            ) : null}
          </div>
        ) : null}
        <p className="auth-footer">
          Back to <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
