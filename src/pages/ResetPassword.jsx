import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

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
    if (!token) {
      toast.error('Missing reset token');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      toast.success('Password reset successful');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
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
        <h1>Reset Password</h1>
        <p className="auth-muted">Choose a new password for your account.</p>
        {!token ? (
          <div className="auth-note auth-note-error">This reset link is invalid. Please request a new one.</div>
        ) : null}
        {done ? (
          <div className="auth-note">
            Password updated. You can now <Link to="/login">sign in</Link>.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="auth-form">
            <div>
              <label className="label" htmlFor="password">
                New Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting || !token} style={{ width: '100%' }}>
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
        <p className="auth-footer">
          Back to <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
