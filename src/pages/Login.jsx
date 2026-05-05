import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

const LOGIN_ILLUSTRATION = '/login-illustration.png';

export function Login() {
  const { login } = useAuth();

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
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [imageHidden, setImageHidden] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      toast.success('Welcome back');
      const target = from === '/dashboard' && loggedUser?.role === 'student' ? '/student/courses' : from;
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <header className="auth-shell-header">
        <div className="auth-shell-inner">
          <SSILogo className="auth-page-brand" />
          <nav className="auth-shell-nav" aria-label="Main">
            <Link to="/">Home</Link>
            <Link to="/#catalog">Courses</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/become-instructor">Become Instructor</Link>
            <Link to="/events">Events</Link>
            <Link to="/#footer-contact">Contacts</Link>
          </nav>
          <div className="auth-shell-actions">
            <Link to="/login" className="auth-shell-link active">
              Sign In
            </Link>
            <Link to="/register" className="auth-shell-btn">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="auth-shell-main">
        <div className="auth-page">
          <div className="card auth-login-card">
            <div className="auth-login-illustration">
              {!imageHidden ? (
                <img src={LOGIN_ILLUSTRATION} alt="Student learning illustration" onError={() => setImageHidden(true)} />
              ) : (
                <div className="auth-login-fallback">SSI</div>
              )}
            </div>
            <div className="auth-login-content">
              <h1>Sign In</h1>
              <p className="auth-muted">Unlock your world.</p>
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
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <div className="auth-password-wrap">
                    <input
                      id="password"
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="auth-inline-link-row">
                  <Link to="/forgot-password" className="auth-inline-link">
                    Forgot password?
                  </Link>
                </div>
                <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
                  {submitting ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <Link to="/register" className="auth-create-btn">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer id="footer-contact" className="auth-shell-footer">
        <div className="auth-shell-inner auth-shell-footer-row">
          <span>info@ssi.so · +252 61 5942611 · Mogadishu, Somalia</span>
          <span>© {new Date().getFullYear()} Success Skills Institute</span>
        </div>
      </footer>
    </div>
  );
}
