import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Clock,
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Tag,
  TrendingUp,
  User,
  Wallet,
} from 'lucide-react';
import { SSILogo } from '../components/SSILogo';
import { useAuth } from '../context/AuthContext';
import './Home.css';
import './BecomeInstructor.css';

const WA_LINK = 'https://wa.me/252615942611';

export function BecomeInstructor() {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#ffffff';
    document.body.style.color = '#1a202c';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success('Thank you! Our team will contact you shortly.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 600);
  }

  return (
    <div className="landing-root bi-page">
      <header className="landing-header">
        <div className="landing-inner landing-header-row">
          <SSILogo />
          <nav className="landing-nav" aria-label="Main">
            <Link to="/">
              Home
            </Link>
            <a href="/#catalog">
              Courses
            </a>
            {user ? (
              <Link to="/dashboard">
                Dashboard
              </Link>
            ) : (
              <Link to="/login">
                Dashboard
              </Link>
            )}
            <Link to="/become-instructor" className="is-active">
              Become Instructor
            </Link>
            <Link to="/events">
              Events
            </Link>
            <a href="/#footer-contact">
              Contacts
            </a>
          </nav>
          <div className="landing-header-actions">
            {user ? (
              <>
                <span className="landing-user-name" title={user.email}>
                  {user.name}
                </span>
                <Link to="/dashboard" className="landing-btn-signup">
                  Dashboard
                </Link>
                <button
                  type="button"
                  className="landing-link-signin landing-signout-btn"
                  onClick={() => logout()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="landing-link-signin">
                  Sign In
                </Link>
                <Link to="/register" className="landing-btn-signup">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="bi-hero" aria-labelledby="bi-hero-title">
        <div className="bi-hero-inner">
          <div className="bi-hero-copy">
            <div className="bi-badge">
              <TrendingUp size={17} aria-hidden />
              Join 500+ Instructors Worldwide
            </div>
            <h1 id="bi-hero-title">
              <span className="bi-title-muted">Share Your </span>
              <span className="bi-title-accent">Knowledge</span>
            </h1>
            <p className="bi-hero-lead">
              Turn your expertise into income. Create courses and reach millions of students.
            </p>
            <div className="bi-hero-features" aria-hidden>
              <span className="bi-hero-chip">
                <BookOpen size={15} strokeWidth={2.5} />
                Online courses
              </span>
              <span className="bi-hero-chip">
                <Globe2 size={15} strokeWidth={2.5} />
                Global reach
              </span>
              <span className="bi-hero-chip">
                <Wallet size={15} strokeWidth={2.5} />
                Earn revenue
              </span>
            </div>
            <a href="#instructor-form" className="bi-cta-orange">
              Start Teaching Today <ArrowRight size={20} aria-hidden />
            </a>
          </div>

          <div className="bi-form-card" id="instructor-form">
            <div className="bi-form-card-header">
              <div className="bi-form-card-icon" aria-hidden>
                <MessageSquare size={24} strokeWidth={2} />
              </div>
              <div>
                <h2>Send us a Message</h2>
                <p className="bi-form-card-sub">We typically reply within one business day.</p>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="bi-form-row">
                <div className="bi-field">
                  <label htmlFor="bi-name">
                    Your Name <span className="bi-req">*</span>
                  </label>
                  <div className="bi-input-wrap">
                    <User className="bi-input-icon" size={18} strokeWidth={2} aria-hidden />
                    <input
                      id="bi-name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Abdi Ali"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="bi-field">
                  <label htmlFor="bi-email">
                    Your Email <span className="bi-req">*</span>
                  </label>
                  <div className="bi-input-wrap">
                    <Mail className="bi-input-icon" size={18} strokeWidth={2} aria-hidden />
                    <input
                      id="bi-email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sample@gmail.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>
              <div className="bi-field">
                <label htmlFor="bi-subject">
                  Subject <span className="bi-req">*</span>
                </label>
                <div className="bi-input-wrap">
                  <Tag className="bi-input-icon" size={18} strokeWidth={2} aria-hidden />
                  <input
                    id="bi-subject"
                    name="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Teaching proposal"
                    required
                  />
                </div>
              </div>
              <div className="bi-field">
                <label htmlFor="bi-message">
                  Message <span className="bi-req">*</span>
                </label>
                <div className="bi-input-wrap bi-input-wrap--area">
                  <MessageSquare className="bi-input-icon" size={18} strokeWidth={2} aria-hidden />
                  <textarea
                    id="bi-message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your experience and the topics you want to teach…"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="bi-submit" disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 size={20} className="bi-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send size={20} aria-hidden />
                    Submit
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="bi-strip" aria-labelledby="bi-strip-title">
        <div className="bi-strip-head">
          <h2 id="bi-strip-title">
            <Building2 size={26} strokeWidth={2} aria-hidden />
            Visit &amp; connect
          </h2>
          <p>Reach our team by email, phone, or visit our headquarters in Mogadishu.</p>
        </div>
        <div className="bi-strip-inner">
          <div className="bi-strip-visual">
            <img
              src="/become-instructor/visit-connect.png"
              alt="Instructor speaking at a Success Skills Institute seminar"
            />
          </div>
          <div className="bi-cards">
            <div className="bi-cards-top">
              <div className="bi-info-card">
                <div className="bi-info-icon">
                  <Mail size={22} strokeWidth={2} />
                </div>
                <h3>Email us</h3>
                <p>
                  <a href="mailto:info@ssi.so">info@ssi.so</a>
                </p>
                <p className="bi-info-sub">
                  <Clock size={14} aria-hidden />
                  We&apos;ll respond within 24 hours.
                </p>
              </div>
              <div className="bi-info-card">
                <div className="bi-info-icon">
                  <Phone size={22} strokeWidth={2} />
                </div>
                <h3>Call us</h3>
                <p>
                  <a href="tel:+252615942611">+252 61 5942611</a>
                </p>
                <p>
                  <a href="tel:+252617000000">+252 61 700 0000</a>
                </p>
                <p className="bi-info-sub">
                  <Clock size={14} aria-hidden />
                  24 hours, available.
                </p>
              </div>
            </div>
            <div className="bi-info-card">
              <div className="bi-info-icon bi-info-icon--muted">
                <MapPin size={22} strokeWidth={2} color="#475569" />
              </div>
              <h3>SSI Headquarters</h3>
              <p>Headquarter Office, Mogadishu, Somalia</p>
            </div>
          </div>
        </div>
      </section>

      <footer id="footer-contact" className="landing-footer">
        <div className="landing-inner landing-footer-grid">
          <div>
            <SSILogo />
            <p className="landing-footer-tagline">Empowering Your Dreams with Real-World Skills</p>
            <div className="landing-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                <span className="landing-social-note">♪</span>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>
          <div>
            <h3>Quick Links</h3>
            <ul className="landing-footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <a href="/#catalog">Courses</a>
              </li>
              <li>
                <Link to="/become-instructor">Become Instructor</Link>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Stay Connected</h3>
            <ul className="landing-footer-contact">
              <li>
                <Mail size={18} aria-hidden />
                <a href="mailto:info@ssi.so">info@ssi.so</a>
              </li>
              <li>
                <Phone size={18} aria-hidden />
                <a href="tel:+252615942611">+252 61 5942611</a>
              </li>
              <li>
                <MapPin size={18} aria-hidden />
                <span>Headquarter Office, Mogadishu, Somalia</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing-inner landing-footer-bar">
          <span>© {new Date().getFullYear()} Success Skills Institute — SSI. All Rights Reserved.</span>
          <span>
            <a href="/#footer-contact">About</a>
            {' · '}
            <a href="/#footer-contact">Privacy Policy</a>
          </span>
        </div>
      </footer>

      <a href={WA_LINK} className="landing-wa-fab" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
