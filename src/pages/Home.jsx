import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  Facebook,
  GraduationCap,
  Heart,
  Instagram,
  Layers,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  Phone,
  PlayCircle,
  Search,
  ShoppingCart,
  Star,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SSILogo } from '../components/SSILogo';
import { addToCart, getCartIds, removeFromCart } from '../utils/cart';
import { resolveMediaUrl } from '../utils/mediaUrl';
import './Home.css';

const WA_LINK = 'https://wa.me/252615942611';

const envHeroSlides = (import.meta.env.VITE_HERO_IMAGES || '')
  .split(',').map((x) => x.trim()).filter(Boolean);
const HERO_SLIDES = envHeroSlides.length ? envHeroSlides : ['/hero%201.jpg', '/hero%202.jpg'];

const FEATURES = [
  {
    icon: <GraduationCap size={28} />,
    title: 'Expert Instructors',
    desc: 'Learn from certified professionals with real-world industry experience.',
    color: '#e0f2fe',
    iconColor: '#0369a1',
  },
  {
    icon: <Clock size={28} />,
    title: 'Lifetime Access',
    desc: 'Study at your own pace — revisit course materials anytime, forever.',
    color: '#fef3c7',
    iconColor: '#d97706',
  },
  {
    icon: <Award size={28} />,
    title: 'Certificates',
    desc: 'Earn verifiable certificates to showcase your new skills to employers.',
    color: '#dcfce7',
    iconColor: '#16a34a',
  },
  {
    icon: <Layers size={28} />,
    title: 'Practical Projects',
    desc: 'Apply what you learn through hands-on projects and real case studies.',
    color: '#ede9fe',
    iconColor: '#7c3aed',
  },
];

const HOW_IT_WORKS = [
  { step: '01', icon: <Search size={26} />, title: 'Choose a Course', desc: 'Browse our catalog and find the course that fits your goals and schedule.' },
  { step: '02', icon: <CheckCircle size={26} />, title: 'Enroll Easily', desc: 'Register in seconds, complete payment, and get instant access to content.' },
  { step: '03', icon: <PlayCircle size={26} />, title: 'Start Learning', desc: 'Watch lessons, complete projects, and earn your certificate of completion.' },
];

const TESTIMONIALS = [
  {
    name: 'Amina Hassan',
    role: 'NGO Project Manager',
    text: 'SSI transformed how I approach project management. The MEAL course was exactly what I needed — practical, well-structured, and delivered by true experts.',
    rating: 5,
    initials: 'AH',
  },
  {
    name: 'Mohamed Aden',
    role: 'Business Development Officer',
    text: "I completed the Business Management course while working full-time. The flexible schedule and lifetime access made it possible. Highly recommended!",
    rating: 5,
    initials: 'MA',
  },
  {
    name: 'Fadumo Warsame',
    role: 'Healthcare Professional',
    text: 'The certificate I earned from SSI helped me land a new position. The quality of instruction is outstanding and the community support is wonderful.',
    rating: 5,
    initials: 'FW',
  },
];

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
}

function CourseSkeleton() {
  return (
    <div className="lp-course-card lp-skeleton-card">
      <div className="lp-skeleton lp-skeleton-thumb" />
      <div className="lp-course-body">
        <div className="lp-skeleton lp-skeleton-line lp-skeleton-w80" />
        <div className="lp-skeleton lp-skeleton-line lp-skeleton-w60" />
        <div className="lp-skeleton lp-skeleton-line lp-skeleton-w40" />
      </div>
    </div>
  );
}

export function Home() {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [heroSlide, setHeroSlide] = useState(0);
  const [cartIds, setCartIds] = useState(() => getCartIds());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.background = '#fff';
    document.body.style.color = '#1e293b';
    return () => { document.body.style.background = ''; document.body.style.color = ''; };
  }, []);

  useEffect(() => {
    Promise.all([api.get('/courses'), api.get('/categories')])
      .then(([courseRes, catRes]) => {
        setCourses(courseRes.data || []);
        setDbCategories(catRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHeroSlide((s) => (s + 1) % HERO_SLIDES.length), 5500);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = [...courses];
    if (category !== 'all') {
      list = list.filter((c) => String(c.category_id?._id || c.category_id) === String(category));
    }
    const sorted = [...list];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else if (sort === 'price-asc') sorted.sort((a, b) => getCoursePrice(a) - getCoursePrice(b));
    else if (sort === 'price-desc') sorted.sort((a, b) => getCoursePrice(b) - getCoursePrice(a));
    else if (sort === 'title-asc') sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    else if (sort === 'title-desc') sorted.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
    return sorted;
  }, [courses, category, sort]);

  function isInCart(id) { return cartIds.includes(String(id)); }

  function onToggleCart(courseId) {
    if (isInCart(courseId)) {
      setCartIds(removeFromCart(courseId));
      toast.success('Removed from cart');
    } else {
      setCartIds(addToCart(courseId));
      toast.success('Added to cart');
    }
  }

  return (
    <div className="lp-root">

      {/* ── NAVBAR ── */}
      <header className="lp-nav-bar">
        <div className="lp-nav-inner">
          <SSILogo />
          <nav className="lp-nav-links" aria-label="Main navigation">
            <Link to="/" className="lp-nav-link lp-nav-link-active">Home</Link>
            <a href="#catalog" className="lp-nav-link">Courses</a>
            <Link to="/events" className="lp-nav-link">Events</Link>
            <Link to="/become-instructor" className="lp-nav-link">Become Instructor</Link>
            <Link to="/contact" className="lp-nav-link">Contact</Link>
          </nav>
          <div className="lp-nav-actions">
            <Link to="/cart" className="lp-cart-btn" aria-label="Cart">
              <ShoppingCart size={18} />
              {cartIds.length > 0 && <span className="lp-cart-badge">{cartIds.length}</span>}
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="lp-btn-outline-sm">Dashboard</Link>
                <button type="button" className="lp-btn-ghost-sm" onClick={logout}>Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="lp-btn-ghost-sm">Sign In</Link>
                <Link to="/register" className="lp-btn-primary-sm">Get Started</Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="lp-mobile-toggle"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="lp-mobile-menu">
            <Link to="/" onClick={() => setMobileNavOpen(false)}>Home</Link>
            <a href="#catalog" onClick={() => setMobileNavOpen(false)}>Courses</a>
            <Link to="/events" onClick={() => setMobileNavOpen(false)}>Events</Link>
            <Link to="/become-instructor" onClick={() => setMobileNavOpen(false)}>Become Instructor</Link>
            <Link to="/contact" onClick={() => setMobileNavOpen(false)}>Contact</Link>
            <div className="lp-mobile-auth">
              {user
                ? <Link to="/dashboard" onClick={() => setMobileNavOpen(false)} className="lp-btn-primary-sm">Dashboard</Link>
                : <>
                    <Link to="/login" onClick={() => setMobileNavOpen(false)} className="lp-btn-ghost-sm">Sign In</Link>
                    <Link to="/register" onClick={() => setMobileNavOpen(false)} className="lp-btn-primary-sm">Get Started</Link>
                  </>
              }
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <div className="lp-hero-badge">
              <TrendingUp size={14} />
              #1 Professional Skills Training in Somalia
            </div>
            <h1 className="lp-hero-heading">
              Build Your Future With<br />
              <span className="lp-hero-heading-accent">Expert-Led Courses</span>
            </h1>
            <p className="lp-hero-sub">
              Join thousands of professionals upgrading their careers through
              practical, certificate-backed courses from SSI — anytime, anywhere.
            </p>
            <div className="lp-hero-actions">
              <a href="#catalog" className="lp-btn-hero-primary">
                Explore Courses <ArrowRight size={18} />
              </a>
              <Link to="/become-instructor" className="lp-btn-hero-secondary">
                Become Instructor
              </Link>
            </div>
            <div className="lp-trust-badges">
              <div className="lp-trust-badge">
                <Star size={15} fill="#f28c28" color="#f28c28" />
                <strong>4.8</strong>
                <span>Rating</span>
              </div>
              <div className="lp-trust-divider" />
              <div className="lp-trust-badge">
                <Users size={15} color="#1d3557" />
                <strong>500+</strong>
                <span>Students</span>
              </div>
              <div className="lp-trust-divider" />
              <div className="lp-trust-badge">
                <BookOpen size={15} color="#1d3557" />
                <strong>15+</strong>
                <span>Courses</span>
              </div>
              <div className="lp-trust-divider" />
              <div className="lp-trust-badge">
                <Trophy size={15} color="#1d3557" />
                <strong>100%</strong>
                <span>Certified</span>
              </div>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-hero-img-frame">
              <img
                key={heroSlide}
                src={HERO_SLIDES[heroSlide]}
                alt={`Hero slide ${heroSlide + 1}`}
                className="lp-hero-img"
              />
              <div className="lp-hero-floating-card lp-hero-card-top">
                <CheckCircle size={18} color="#16a34a" />
                <div>
                  <strong>Certificate Earned</strong>
                  <span>Business Management</span>
                </div>
              </div>
              <div className="lp-hero-floating-card lp-hero-card-bottom">
                <Users size={18} color="#0369a1" />
                <div>
                  <strong>120 students</strong>
                  <span>joined this week</span>
                </div>
              </div>
            </div>
            <div className="lp-hero-dots">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`lp-hero-dot ${i === heroSlide ? 'active' : ''}`}
                  onClick={() => setHeroSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="lp-stats-bar">
        <div className="lp-stats-inner">
          {[
            { icon: <Users size={22} />, value: '500+', label: 'Active Students' },
            { icon: <BookOpen size={22} />, value: '15+', label: 'Expert Courses' },
            { icon: <Trophy size={22} />, value: '8+', label: 'Top Instructors' },
            { icon: <Award size={22} />, value: '100%', label: 'Completion Rate' },
          ].map((s) => (
            <div key={s.label} className="lp-stat-item">
              <span className="lp-stat-icon">{s.icon}</span>
              <span className="lp-stat-value">{s.value}</span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section lp-features-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Why Choose SSI</span>
            <h2 className="lp-section-title">Everything You Need to Succeed</h2>
            <p className="lp-section-sub">
              We combine world-class instruction with flexible access and recognized credentials.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon" style={{ background: f.color, color: f.iconColor }}>
                  {f.icon}
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
                <span className="lp-feature-link">
                  Learn more <ChevronRight size={14} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COURSE CATALOG ── */}
      <section id="catalog" className="lp-section lp-catalog-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Our Courses</span>
            <h2 className="lp-section-title">Popular Courses</h2>
            <p className="lp-section-sub">
              Explore our most in-demand courses, taught by industry professionals.
            </p>
          </div>

          {/* Category + Sort bar */}
          <div className="lp-catalog-bar">
            <div className="lp-cat-pills">
              <button
                type="button"
                className={`lp-cat-pill ${category === 'all' ? 'active' : ''}`}
                onClick={() => setCategory('all')}
              >
                All Courses
              </button>
              {dbCategories.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className={`lp-cat-pill ${category === c._id ? 'active' : ''}`}
                  onClick={() => setCategory(c._id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <select
              className="lp-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort courses"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title-asc">Title A–Z</option>
              <option value="title-desc">Title Z–A</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {/* Course grid */}
          <div className="lp-course-grid">
            {loading && Array.from({ length: 6 }).map((_, i) => <CourseSkeleton key={i} />)}
            {!loading && filtered.length === 0 && (
              <p className="lp-empty-state">No courses match your filters.</p>
            )}
            {!loading && filtered.map((c) => {
              const teacherName = c.teacher_id?.name || 'Instructor';
              const thumb = resolveMediaUrl(c.thumbnail) || '/placeholder-course.svg';
              const inCart = isInCart(c._id);
              const price = getCoursePrice(c);
              const hasSale = price < Number(c.price || 0);
              const catName = c.category_id?.name || 'General';
              return (
                <article key={c._id} className="lp-course-card">
                  <Link to={`/courses/${c._id}`} className="lp-course-thumb-link">
                    <img
                      src={thumb}
                      alt={c.title}
                      className="lp-course-thumb"
                      loading="lazy"
                      onError={(e) => { e.target.src = '/placeholder-course.svg'; }}
                    />
                    <span className="lp-course-cat-badge">{catName}</span>
                  </Link>
                  <div className="lp-course-body">
                    <h3 className="lp-course-title">
                      <Link to={`/courses/${c._id}`}>{c.title}</Link>
                    </h3>
                    <div className="lp-course-meta">
                      <span className="lp-course-instructor">
                        <GraduationCap size={13} /> {teacherName}
                      </span>
                      <span className="lp-course-duration">
                        <Clock size={13} /> {c.duration || '—'}h
                      </span>
                    </div>
                    <div className="lp-course-rating">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} size={13} fill="#f28c28" color="#f28c28" />
                      ))}
                      <span className="lp-course-rating-count">(4.8)</span>
                    </div>
                  </div>
                  <div className="lp-course-footer">
                    <div className="lp-course-price-row">
                      <span className="lp-course-price">${price.toFixed(2)}</span>
                      {hasSale && <span className="lp-course-price-old">${Number(c.price).toFixed(2)}</span>}
                    </div>
                    <div className="lp-course-footer-btns">
                      <button
                        type="button"
                        className="lp-cart-toggle-btn"
                        onClick={() => onToggleCart(c._id)}
                        aria-label={inCart ? 'Remove from cart' : 'Add to cart'}
                      >
                        <Heart size={15} fill={inCart ? '#f28c28' : 'none'} color={inCart ? '#f28c28' : '#94a3b8'} />
                      </button>
                      <Link to={`/courses/${c._id}`} className="lp-btn-view-course">
                        View Course <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-how-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Simple Process</span>
            <h2 className="lp-section-title">How It Works</h2>
            <p className="lp-section-sub">
              Get started in three easy steps and begin your learning journey today.
            </p>
          </div>
          <div className="lp-how-grid">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="lp-how-card">
                <div className="lp-how-step-num">{step.step}</div>
                <div className="lp-how-icon">{step.icon}</div>
                <h3 className="lp-how-title">{step.title}</h3>
                <p className="lp-how-desc">{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="lp-how-arrow"><ArrowRight size={20} /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="lp-section lp-testimonials-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-section-tag">Student Stories</span>
            <h2 className="lp-section-title">What Our Students Say</h2>
            <p className="lp-section-sub">
              Real reviews from professionals who transformed their careers with SSI.
            </p>
          </div>
          <div className="lp-testimonials-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="lp-testimonial-card">
                <div className="lp-testimonial-stars">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={15} fill="#f28c28" color="#f28c28" />
                  ))}
                </div>
                <p className="lp-testimonial-text">"{t.text}"</p>
                <div className="lp-testimonial-author">
                  <div className="lp-testimonial-avatar">{t.initials}</div>
                  <div>
                    <strong className="lp-testimonial-name">{t.name}</strong>
                    <span className="lp-testimonial-role">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OFFLINE ENROLLMENT BANNER ── */}
      <section className="lp-offline-section">
        <div className="lp-container lp-offline-inner">
          <div className="lp-offline-text">
            <span className="lp-section-tag lp-section-tag-light">In-Person Classes</span>
            <h2 className="lp-offline-heading">Prefer Learning Face-to-Face?</h2>
            <p className="lp-offline-sub">
              Register for our offline courses at SSI headquarters in Mogadishu.
              Meet instructors in person and get hands-on guidance.
            </p>
          </div>
          <Link to="/offline-enrollment" className="lp-btn-offline">
            Register for Offline Class <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="lp-cta-section">
        <div className="lp-container lp-cta-inner">
          <Zap size={40} className="lp-cta-icon" />
          <h2 className="lp-cta-heading">Start Learning Today</h2>
          <p className="lp-cta-sub">
            Join 500+ students already building their future skills with SSI.
          </p>
          <div className="lp-cta-buttons">
            <a href="#catalog" className="lp-btn-cta-primary">
              Browse Courses <ArrowRight size={17} />
            </a>
            <Link to="/register" className="lp-btn-cta-ghost">
              Enroll Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="lp-footer">
        <div className="lp-container lp-footer-grid">
          <div className="lp-footer-brand">
            <SSILogo />
            <p className="lp-footer-tagline">
              Empowering professionals with real-world skills and recognized certificates.
            </p>
            <div className="lp-footer-social">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={17} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn"><Linkedin size={17} /></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={17} /></a>
              <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
                <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>♪</span>
              </a>
            </div>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Explore</h4>
            <ul className="lp-footer-links">
              <li><Link to="/">Home</Link></li>
              <li><a href="#catalog">Courses</a></li>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/become-instructor">Become Instructor</Link></li>
              <li><Link to="/certificate/verify">Verify Certificate</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Account</h4>
            <ul className="lp-footer-links">
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Account</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="lp-footer-col-title">Contact Us</h4>
            <ul className="lp-footer-contact-list">
              <li><Mail size={15} /><a href="mailto:info@ssi.so">info@ssi.so</a></li>
              <li><Phone size={15} /><a href="tel:+252615942611">+252 61 5942611</a></li>
              <li><Briefcase size={15} /><a href={WA_LINK} target="_blank" rel="noreferrer">WhatsApp Chat</a></li>
              <li><MapPin size={15} /><span>Mogadishu, Somalia</span></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bar">
          <span>© {new Date().getFullYear()} Success Skills Institute — SSI. All rights reserved.</span>
          <div className="lp-footer-bar-links">
            <a href="#contact">Privacy Policy</a>
            <a href="#contact">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <a href={WA_LINK} className="lp-wa-fab" target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  );
}
