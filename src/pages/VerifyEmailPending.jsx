import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

export function VerifyEmailPending() {
  const location = useLocation();
  const devVerifyUrl = location.state?.devVerifyUrl || '';

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

  return (
    <div className="auth-page">
      <div className="auth-page-top">
        <SSILogo className="auth-page-brand" />
      </div>
      <div className="card auth-card">
        <h1>Check your email</h1>
        <p className="auth-muted">We generated a verification link for your account.</p>
        <div className="auth-note auth-note-success">
          <p>Your account is created. Please verify your email to complete setup.</p>
          {devVerifyUrl ? (
            <a href={devVerifyUrl} className="auth-inline-link">
              Open verification link (dev)
            </a>
          ) : null}
        </div>
        <div className="auth-actions-row">
          <Link to="/login" className="btn btn-primary">
            Go to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
