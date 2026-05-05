import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [devVerifyUrl, setDevVerifyUrl] = useState('');

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

  useEffect(() => {
    let active = true;
    async function run() {
      if (!token) {
        if (!active) return;
        setStatus('error');
        setMessage('Missing verification token.');
        return;
      }
      try {
        const { data } = await api.get('/auth/verify-email', { params: { token } });
        if (!active) return;
        setStatus('success');
        setMessage(data?.message || 'Email verified successfully.');
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [token]);

  const noteClass = useMemo(() => {
    if (status === 'error') return 'auth-note auth-note-error';
    if (status === 'success') return 'auth-note auth-note-success';
    return 'auth-note';
  }, [status]);

  async function resendVerification() {
    try {
      const { data } = await api.post('/auth/send-verification');
      setDevVerifyUrl(data?.dev_verify_url || '');
      setMessage('A new verification link has been generated.');
      setStatus('info');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Could not generate a new link.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page-top">
        <SSILogo className="auth-page-brand" />
      </div>
      <div className="card auth-card">
        <h1>Verify Email</h1>
        <p className="auth-muted">Confirm your email address to keep your account secure.</p>
        <div className={noteClass}>
          <p>{message}</p>
          {devVerifyUrl ? (
            <a href={devVerifyUrl} className="auth-inline-link">
              Open new verify link (dev)
            </a>
          ) : null}
        </div>
        <div className="auth-actions-row">
          <button type="button" className="btn btn-secondary" onClick={resendVerification}>
            Resend Verification
          </button>
          <Link to="/login" className="btn btn-ghost">
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
