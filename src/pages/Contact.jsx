import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';

const WA_LINK = 'https://wa.me/252615942611';

const CONTACT_INFO = [
  {
    icon: <Mail size={22} />,
    label: 'Email us',
    value: 'info@ssi.so',
    sub: "We'll respond within 24 hours",
    href: 'mailto:info@ssi.so',
    color: '#fff7ed',
    iconColor: '#f28c28',
  },
  {
    icon: <Phone size={22} />,
    label: 'Call us',
    value: '+252 615942611 / +252 612992289',
    sub: 'Sat-Thru, 7AM-6PM PST',
    href: 'tel:+252615942611',
    color: '#fff7ed',
    iconColor: '#f28c28',
  },
  {
    icon: <MapPin size={22} />,
    label: 'Visit Us',
    value: 'Headquarter Office',
    sub: 'Mogadishu Somalia',
    color: '#fff7ed',
    iconColor: '#f28c28',
  },
  {
    icon: <MessageSquare size={22} />,
    label: 'Support Hours',
    value: '24/7 Online Support',
    sub: 'Always here to help',
    href: WA_LINK,
    color: '#fff7ed',
    iconColor: '#f28c28',
    external: true,
  },
];

const FAQS = [
  {
    q: 'How do I enroll in a course?',
    a: 'Browse our course catalog, click on a course you like, then click "Checkout". Complete the payment and you will immediately get access. For offline classes, visit our Registration page.',
  },
  {
    q: 'Do you offer certificates of completion?',
    a: 'Yes! Every course comes with a verifiable digital certificate once you complete all lessons. You can share it on LinkedIn or use it in job applications. Admins can verify certificates using the serial number.',
  },
  {
    q: 'Can I attend offline (in-person) classes?',
    a: 'Absolutely. We offer in-person classes at our headquarters in Mogadishu. Use the Offline Enrollment page to register, then visit the center for payment and scheduling.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept EVC Plus, Zaad, and cash payments at our office. After checkout you can upload your payment proof and an admin will verify and approve your enrollment.',
  },
  {
    q: 'How long do I have access to a course?',
    a: 'Once enrolled, you have lifetime access to the course materials. You can revisit lessons, resources, and assignments at any time on any device.',
  },
];

const EMPTY = { fullName: '', email: '', phone: '', subject: '', message: '' };

export function Contact() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  function field(key) {
    return {
      value: form[key],
      onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contact', form);
      setSuccess(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ct-root">

      {/* ── NAVBAR ── */}
      <header className="ct-nav">
        <div className="ct-nav-inner">
          <SSILogo />
          <nav className="ct-nav-links">
            <Link to="/" className="ct-nav-link">Home</Link>
            <Link to="/#catalog" className="ct-nav-link">Courses</Link>
            <Link to="/events" className="ct-nav-link">Events</Link>
            <Link to="/become-instructor" className="ct-nav-link">Become Instructor</Link>
            <Link to="/contact" className="ct-nav-link ct-nav-active">Contact</Link>
          </nav>
          <div className="ct-nav-actions">
            <Link to="/login" className="ct-btn-ghost">Sign In</Link>
            <Link to="/register" className="ct-btn-primary-nav">Get Started</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="ct-hero">
        <div className="ct-hero-bg" aria-hidden />
        <div className="ct-container ct-hero-inner">
          <span className="ct-hero-tag">
            <MessageSquare size={13} /> Contact Us
          </span>
          <h1 className="ct-hero-heading">Get in Touch</h1>
          <p className="ct-hero-sub">
            We'd love to hear from you. Send us a message and we'll respond
            as soon as possible — usually within 24 hours.
          </p>
          <div className="ct-hero-pills">
            <span>📍 Mogadishu, Somalia</span>
            <span>📞 +252 615942611 / +252 612992289</span>
            <span>📧 info@ssi.so</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section className="ct-main-section">
        <div className="ct-container ct-main-grid">

          {/* Left — contact info + social */}
          <aside className="ct-info-col">
            <div className="ct-info-card">
              <h2 className="ct-info-title">Contact Information</h2>
              <p className="ct-info-sub">
                Reach us through any of these channels — we're always happy to help.
              </p>
              <div className="ct-info-list">
                {CONTACT_INFO.map((item) => (
                  <div key={item.label} className="ct-info-item">
                    <div
                      className="ct-info-icon"
                      style={{ background: item.color, color: item.iconColor }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <span className="ct-info-item-label">{item.label}</span>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="ct-info-item-value ct-info-link"
                          target={item.external ? '_blank' : undefined}
                          rel={item.external ? 'noreferrer' : undefined}
                        >
                          {item.value}
                        </a>
                      ) : (
                        <span className="ct-info-item-value">{item.value}</span>
                      )}
                      {item.sub && <span className="ct-info-item-sub">{item.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ct-social-section">
                <p className="ct-social-label">Follow us</p>
                <div className="ct-social-row">
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="ct-social-btn">
                    <Facebook size={18} />
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="ct-social-btn">
                    <Instagram size={18} />
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="ct-social-btn">
                    <Linkedin size={18} />
                  </a>
                  <a href={WA_LINK} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="ct-social-btn ct-social-wa">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </aside>

          {/* Right — form */}
          <div className="ct-form-col">
            <div className="ct-form-card">
              <h2 className="ct-form-title">Send Us a Message</h2>
              <p className="ct-form-sub">Fill out the form below and our team will get back to you shortly.</p>

              {success ? (
                <div className="ct-success-state">
                  <CheckCircle2 size={52} className="ct-success-icon" />
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. We'll respond to your message within 24 hours.</p>
                  <button type="button" className="ct-btn-submit" onClick={() => setSuccess(false)}>
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form className="ct-form" onSubmit={onSubmit} noValidate>
                  {error && <div className="ct-error-banner">{error}</div>}

                  <div className="ct-form-row">
                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-fullname">
                        Full Name <span className="ct-required">*</span>
                      </label>
                      <input
                        id="ct-fullname"
                        className="ct-input"
                        type="text"
                        placeholder="e.g. Mohamed Ali"
                        {...field('fullName')}
                        required
                      />
                    </div>
                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-email">
                        Email Address <span className="ct-required">*</span>
                      </label>
                      <input
                        id="ct-email"
                        className="ct-input"
                        type="email"
                        placeholder="e.g. name@example.com"
                        {...field('email')}
                        required
                      />
                    </div>
                  </div>

                  <div className="ct-form-row">
                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-phone">
                        Phone Number <span className="ct-optional">(optional)</span>
                      </label>
                      <input
                        id="ct-phone"
                        className="ct-input"
                        type="tel"
                        placeholder="e.g. +252 61 5942611"
                        {...field('phone')}
                      />
                    </div>
                    <div className="ct-field">
                      <label className="ct-label" htmlFor="ct-subject">
                        Subject <span className="ct-required">*</span>
                      </label>
                      <input
                        id="ct-subject"
                        className="ct-input"
                        type="text"
                        placeholder="e.g. Course Inquiry"
                        {...field('subject')}
                        required
                      />
                    </div>
                  </div>

                  <div className="ct-field">
                    <label className="ct-label" htmlFor="ct-message">
                      Message <span className="ct-required">*</span>
                    </label>
                    <textarea
                      id="ct-message"
                      className="ct-input ct-textarea"
                      placeholder="Write your message here…"
                      rows={5}
                      {...field('message')}
                      required
                    />
                  </div>

                  <button type="submit" className="ct-btn-submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={17} className="ct-spinner" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="ct-faq-section">
        <div className="ct-container">
          <div className="ct-section-head">
            <span className="ct-section-tag">FAQ</span>
            <h2 className="ct-section-title">Frequently Asked Questions</h2>
            <p className="ct-section-sub">
              Quick answers to the questions we hear most often.
            </p>
          </div>
          <div className="ct-faq-list">
            {FAQS.map((item, i) => (
              <div
                key={i}
                className={`ct-faq-item ${openFaq === i ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="ct-faq-trigger"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span>{item.q}</span>
                  <ChevronDown size={18} className="ct-faq-chevron" />
                </button>
                <div className="ct-faq-body">
                  <div className="ct-faq-answer">{item.a}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="ct-faq-cta">
            <p>Still have questions?</p>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="ct-btn-wa">
              Chat on WhatsApp <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ct-footer">
        <div className="ct-container ct-footer-inner">
          <SSILogo />
          <p className="ct-footer-copy">
            © {new Date().getFullYear()} Success Skills Institute — SSI. All rights reserved.
          </p>
          <div className="ct-footer-links">
            <Link to="/">Home</Link>
            <Link to="/#catalog">Courses</Link>
            <Link to="/become-instructor">Become Instructor</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Root & shared ── */
        .ct-root { font-family: 'DM Sans','Inter',sans-serif; color: #1e293b; background: #fff; }
        .ct-container { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; }
        .ct-section-head { text-align: center; margin-bottom: 2.5rem; }
        .ct-section-tag {
          display: inline-block; background: #e0f2fe; color: #0369a1;
          font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 0.3rem 0.85rem;
          border-radius: 20px; margin-bottom: 0.65rem;
        }
        .ct-section-title { font-size: clamp(1.45rem,2.5vw,2rem); font-weight: 800; color: #1d3557; margin: 0 0 0.5rem; letter-spacing: -0.02em; }
        .ct-section-sub { font-size: 0.95rem; color: #64748b; max-width: 520px; margin: 0 auto; line-height: 1.7; }

        /* ── Navbar ── */
        .ct-nav { background: rgba(255,255,255,0.97); backdrop-filter: blur(12px); border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 100; }
        .ct-nav-inner { max-width: 1140px; margin: 0 auto; padding: 0 1.5rem; height: 64px; display: flex; align-items: center; gap: 2rem; }
        .ct-nav-links { display: flex; gap: 0.2rem; flex: 1; }
        .ct-nav-link { font-size: 0.88rem; font-weight: 500; color: #64748b; text-decoration: none; padding: 0.42rem 0.7rem; border-radius: 7px; transition: color 0.15s, background 0.15s; }
        .ct-nav-link:hover { color: #1d3557; background: #f8fafc; }
        .ct-nav-active { color: #1d3557 !important; font-weight: 700; }
        .ct-nav-actions { display: flex; gap: 0.5rem; }
        .ct-btn-ghost { font-size: 0.86rem; font-weight: 600; color: #1d3557; padding: 0.4rem 0.85rem; border-radius: 8px; text-decoration: none; transition: background 0.15s; }
        .ct-btn-ghost:hover { background: #f8fafc; }
        .ct-btn-primary-nav { font-size: 0.86rem; font-weight: 700; color: #fff; background: #1d3557; padding: 0.45rem 1.1rem; border-radius: 8px; text-decoration: none; transition: background 0.15s; }
        .ct-btn-primary-nav:hover { background: #132440; }

        /* ── Hero ── */
        .ct-hero { background: linear-gradient(135deg, #1d3557 0%, #1a4a7a 55%, #2563eb 100%); padding: 5rem 0 4rem; text-align: center; position: relative; overflow: hidden; }
        .ct-hero-bg { position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E"); pointer-events: none; }
        .ct-hero-inner { position: relative; }
        .ct-hero-tag { display: inline-flex; align-items: center; gap: 0.4rem; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9); font-size: 0.8rem; font-weight: 600; padding: 0.35rem 0.85rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); margin-bottom: 1.25rem; }
        .ct-hero-heading { font-size: clamp(2rem,4vw,3.25rem); font-weight: 900; color: #fff; letter-spacing: -0.03em; margin: 0 0 1rem; }
        .ct-hero-sub { font-size: 1.05rem; color: rgba(255,255,255,0.78); line-height: 1.7; margin: 0 auto 2rem; max-width: 520px; }
        .ct-hero-pills { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .ct-hero-pills span { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); font-size: 0.85rem; padding: 0.4rem 1rem; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); }

        /* ── Main grid ── */
        .ct-main-section { padding: 5rem 0; background: #f8fafc; }
        .ct-main-grid { display: grid; grid-template-columns: 380px 1fr; gap: 2rem; align-items: start; }

        /* ── Info column ── */
        .ct-info-card { background: #1d3557; border-radius: 16px; padding: 2rem; color: #fff; position: sticky; top: 80px; }
        .ct-info-title { font-size: 1.2rem; font-weight: 800; margin: 0 0 0.4rem; }
        .ct-info-sub { font-size: 0.88rem; color: rgba(255,255,255,0.65); margin: 0 0 1.75rem; line-height: 1.6; }
        .ct-info-list { display: flex; flex-direction: column; gap: 1.25rem; margin-bottom: 2rem; }
        .ct-info-item { display: flex; align-items: flex-start; gap: 0.9rem; }
        .ct-info-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ct-info-item-label { display: block; font-size: 0.75rem; color: rgba(255,255,255,0.55); font-weight: 500; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
        .ct-info-item-value { display: block; font-size: 0.9rem; color: rgba(255,255,255,0.9); font-weight: 500; line-height: 1.5; }
        .ct-info-item-sub { display: block; font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 2px; line-height: 1.4; }
        .ct-info-link { text-decoration: none; transition: color 0.15s; }
        .ct-info-link:hover { color: #f28c28; }
        .ct-social-section { border-top: 1px solid rgba(255,255,255,0.12); padding-top: 1.25rem; }
        .ct-social-label { font-size: 0.78rem; color: rgba(255,255,255,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; }
        .ct-social-row { display: flex; gap: 0.6rem; }
        .ct-social-btn { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; text-decoration: none; transition: background 0.15s, color 0.15s; }
        .ct-social-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }
        .ct-social-wa:hover { background: #25d366 !important; color: #fff !important; }

        /* ── Form card ── */
        .ct-form-card { background: #fff; border-radius: 16px; padding: 2.25rem; box-shadow: 0 4px 24px rgba(29,53,87,0.08); border: 1px solid #e2e8f0; }
        .ct-form-title { font-size: 1.35rem; font-weight: 800; color: #1d3557; margin: 0 0 0.35rem; }
        .ct-form-sub { font-size: 0.88rem; color: #64748b; margin: 0 0 1.75rem; line-height: 1.6; }
        .ct-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .ct-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .ct-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .ct-label { font-size: 0.86rem; font-weight: 600; color: #374151; }
        .ct-required { color: #ef4444; }
        .ct-optional { font-weight: 400; color: #94a3b8; font-size: 0.8rem; }
        .ct-input {
          height: 44px; padding: 0 0.9rem;
          border: 1.5px solid #e2e8f0; border-radius: 9px;
          font-size: 0.92rem; font-family: inherit; color: #1e293b; background: #fff;
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%; box-sizing: border-box;
        }
        .ct-input:focus { border-color: #1d3557; box-shadow: 0 0 0 3px rgba(29,53,87,0.08); }
        .ct-textarea { height: auto; padding: 0.75rem 0.9rem; resize: vertical; line-height: 1.6; }
        .ct-error-banner { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 8px; padding: 0.7rem 0.9rem; font-size: 0.87rem; }
        .ct-btn-submit {
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
          height: 48px; background: #1d3557; color: #fff;
          border: none; border-radius: 9px; font-size: 0.97rem; font-weight: 700;
          font-family: inherit; cursor: pointer; transition: background 0.15s, transform 0.15s;
          margin-top: 0.25rem;
        }
        .ct-btn-submit:hover:not(:disabled) { background: #132440; transform: translateY(-1px); }
        .ct-btn-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .ct-spinner { animation: ct-spin 0.8s linear infinite; }
        @keyframes ct-spin { to { transform: rotate(360deg); } }

        /* Success state */
        .ct-success-state { text-align: center; padding: 2.5rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .ct-success-icon { color: #16a34a; }
        .ct-success-state h3 { font-size: 1.3rem; font-weight: 800; color: #1d3557; margin: 0; }
        .ct-success-state p { font-size: 0.92rem; color: #64748b; margin: 0; line-height: 1.65; max-width: 340px; }

        /* ── Map ── */
        .ct-map-section { padding: 4rem 0; background: #fff; }
        .ct-map-head { text-align: center; margin-bottom: 1.75rem; }
        .ct-map-title { font-size: 1.5rem; font-weight: 800; color: #1d3557; margin: 0 0 0.4rem; }
        .ct-map-sub { font-size: 0.92rem; color: #64748b; margin: 0; }
        .ct-map-frame { border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(29,53,87,0.1); border: 1px solid #e2e8f0; height: 380px; }
        .ct-map-frame iframe { width: 100%; height: 100%; border: none; display: block; }

        /* ── FAQ ── */
        .ct-faq-section { padding: 5rem 0; background: #f8fafc; }
        .ct-faq-list { max-width: 760px; margin: 0 auto 2.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .ct-faq-item { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s; }
        .ct-faq-item.is-open { border-color: #1d3557; box-shadow: 0 4px 16px rgba(29,53,87,0.08); }
        .ct-faq-trigger { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.1rem 1.25rem; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; font-size: 0.95rem; font-weight: 600; color: #1e293b; }
        .ct-faq-chevron { flex-shrink: 0; color: #94a3b8; transition: transform 0.22s; }
        .ct-faq-item.is-open .ct-faq-chevron { transform: rotate(180deg); color: #1d3557; }
        .ct-faq-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.24s ease; }
        .ct-faq-item.is-open .ct-faq-body { grid-template-rows: 1fr; }
        .ct-faq-answer { min-height: 0; overflow: hidden; padding: 0 1.25rem 1.15rem; font-size: 0.9rem; color: #64748b; line-height: 1.7; }
        .ct-faq-cta { text-align: center; }
        .ct-faq-cta p { font-size: 0.95rem; color: #64748b; margin: 0 0 0.85rem; }
        .ct-btn-wa { display: inline-flex; align-items: center; gap: 0.45rem; background: #25d366; color: #fff; font-weight: 700; font-size: 0.92rem; padding: 0.7rem 1.5rem; border-radius: 9px; text-decoration: none; transition: background 0.15s; }
        .ct-btn-wa:hover { background: #1ab857; }

        /* ── Footer ── */
        .ct-footer { background: #0b1a2c; padding: 1.75rem 0; }
        .ct-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .ct-footer-copy { font-size: 0.82rem; color: rgba(255,255,255,0.4); margin: 0; }
        .ct-footer-links { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .ct-footer-links a { font-size: 0.82rem; color: rgba(255,255,255,0.45); text-decoration: none; transition: color 0.15s; }
        .ct-footer-links a:hover { color: rgba(255,255,255,0.85); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .ct-main-grid { grid-template-columns: 1fr; }
          .ct-info-card { position: static; }
        }
        @media (max-width: 600px) {
          .ct-form-row { grid-template-columns: 1fr; }
          .ct-nav-links { display: none; }
          .ct-nav-actions { display: none; }
          .ct-hero { padding: 3.5rem 0 3rem; }
          .ct-footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
    </div>
  );
}
