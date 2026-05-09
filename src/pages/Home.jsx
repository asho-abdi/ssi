import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Facebook,
  Eye,
  Heart,
  Instagram,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  ShoppingCart,
  Shuffle,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { SSILogo } from '../components/SSILogo';
import { addToCart, getCartIds, removeFromCart } from '../utils/cart';
import { resolveMediaUrl } from '../utils/mediaUrl';
import './Home.css';

const WA_LINK = 'https://wa.me/252615942611';
/** Local assets in `frontend/public/`; optional override: `VITE_HERO_IMAGES` = comma-separated URLs */
const envHeroSlides = (import.meta.env.VITE_HERO_IMAGES || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
const HERO_SLIDES = envHeroSlides.length ? envHeroSlides : ['/hero%201.jpg', '/hero%202.jpg'];
const FEATURE_POINTS = [
  'Access to all courses',
  'Certificate of completion',
  '24/7 learning support',
  'Project-based learning',
];


function splitTitleForBanner(title) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return { first: title, second: '' };
  const mid = Math.max(1, Math.ceil(words.length / 2));
  return {
    first: words.slice(0, mid).join(' '),
    second: words.slice(mid).join(' '),
  };
}

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
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

  useEffect(() => {
    Promise.all([api.get('/courses'), api.get('/categories')])
      .then(([courseRes, catRes]) => {
        setCourses(courseRes.data);
        setDbCategories(catRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroSlide((s) => (s + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    let list = [...courses];
    if (category !== 'all') {
      list = list.filter((c) => {
        const catId = c.category_id?._id || c.category_id;
        return String(catId) === String(category);
      });
    }
    const sorted = [...list];
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sort === 'price-asc') {
      sorted.sort((a, b) => getCoursePrice(a) - getCoursePrice(b));
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => getCoursePrice(b) - getCoursePrice(a));
    } else if (sort === 'title-asc') {
      sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    } else if (sort === 'title-desc') {
      sorted.sort((a, b) => String(b.title || '').localeCompare(String(a.title || '')));
    }
    return sorted;
  }, [courses, category, sort]);

  function categoryLabel(catObj) {
    if (!catObj) return 'General';
    return catObj.name || 'General';
  }

  function isInCart(courseId) {
    return cartIds.includes(String(courseId));
  }

  function onToggleCart(courseId) {
    if (isInCart(courseId)) {
      const updated = removeFromCart(courseId);
      setCartIds(updated);
      toast.success('Removed from cart');
      return;
    }
    const updated = addToCart(courseId);
    setCartIds(updated);
    toast.success('Added to cart');
  }

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-inner landing-header-row">
          <SSILogo />
          <nav className="landing-nav" aria-label="Main">
            <Link to="/" className="is-active">
              Home
            </Link>
            <a href="#catalog">
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
            <Link to="/become-instructor">
              Become Instructor
            </Link>
            <Link to="/events">
              Events
            </Link>
            <Link to="/offline-enrollment">
              Offline Enrollment
            </Link>
            <a href="#footer-contact">
              Contacts
            </a>
          </nav>
          <div className="landing-header-actions">
            <Link to="/cart" className="landing-cart-link" aria-label="Cart">
              <ShoppingCart size={17} />
              <span>Cart</span>
              <span className="landing-cart-count">{cartIds.length}</span>
            </Link>
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

      <section className="landing-hero">
        <div className="landing-inner landing-hero-grid">
          <div>
            <div className="landing-badge">
              <TrendingUp size={16} aria-hidden />
              #1 Professional Skills Training
            </div>
            <h1>Build Your Success With Expert Courses</h1>
            <p className="landing-hero-lead">
              Ku soo biir SSI E-Learning Platform - Madal Waxbarasho Casri ah oo kuu sahlaysa inaad wax ka barato
              Goob Kasta iyo Goor kastaba.
              <span className="landing-hero-lead-so">
                Join a trusted learning platform with practical courses, certificates, and support from industry
                experts.
              </span>
            </p>
            <div className="landing-hero-cta">
              <a href="#catalog" className="landing-btn-primary">
                Explore Courses <ArrowRight size={18} />
              </a>
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="landing-btn-outline-wa">
                <span aria-hidden>💬</span> Contacts
              </a>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-hero-img-wrap">
              <img
                key={heroSlide}
                className="landing-hero-slide"
                src={HERO_SLIDES[heroSlide]}
                alt={`Hero slide ${heroSlide + 1}`}
              />
            </div>
            <div className="landing-hero-dots" role="tablist" aria-label="Hero images">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === heroSlide ? 'is-on' : ''}
                  onClick={() => setHeroSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                  aria-selected={i === heroSlide}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" aria-label="Features">
        <div className="landing-inner">
          <div className="landing-features-grid">
            {FEATURE_POINTS.map((t) => (
              <article key={t} className="landing-feature-card">
                <Check size={18} strokeWidth={2.5} />
                <span>{t}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-stats" aria-label="Statistics">
        <div className="landing-stats-grid">
          <div className="landing-stat">
            <div className="landing-stat-icon">
              <Users size={24} />
            </div>
            <div className="landing-stat-value">500+</div>
            <div className="landing-stat-label">Active Students</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon">
              <BookOpen size={24} />
            </div>
            <div className="landing-stat-value">15+</div>
            <div className="landing-stat-label">Expert Courses</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon">
              <Trophy size={24} />
            </div>
            <div className="landing-stat-value">8+</div>
            <div className="landing-stat-label">Expert Instructors</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="landing-stat-value">100%</div>
            <div className="landing-stat-label">Success Rate</div>
          </div>
        </div>
      </section>

      <section className="landing-filters">
        <div className="landing-inner landing-filters-row">
          <div className="landing-filter-pills" role="group" aria-label="Categories">
            <button
              type="button"
              className={category === 'all' ? 'on' : 'off'}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {dbCategories.map((c) => (
              <button
                key={c._id}
                type="button"
                className={category === c._id ? 'on' : 'off'}
                onClick={() => setCategory(c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <label className="landing-sr-only">
            Sort courses
          </label>
          <select className="landing-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Release Date (newest first)</option>
            <option value="oldest">Release Date (oldest first)</option>
            <option value="title-asc">Course Title (a-z)</option>
            <option value="title-desc">Course Title (z-a)</option>
            <option value="price-asc">Price (low to high)</option>
            <option value="price-desc">Price (high to low)</option>
          </select>
        </div>
      </section>

      <section id="catalog" className="landing-catalog">
        <div className="landing-inner">
          <h2 className="landing-section-title">Course catalog</h2>
          {loading && <p style={{ color: 'var(--ssi-muted, #707070)' }}>Loading courses…</p>}
          <div className="landing-course-grid">
            {!loading && filtered.length === 0 && (
              <p className="landing-empty">No courses match your filters.</p>
            )}
            {filtered.map((c) => {
              const { first, second } = splitTitleForBanner(c.title);
              const teacherName = c.teacher_id?.name || 'Instructor';
              const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=1d3557&color=fff&size=128`;
              const courseThumb = resolveMediaUrl(c.thumbnail) || '';
              const inCart = isInCart(c._id);
              const displayPrice = getCoursePrice(c);
              const hasSale = displayPrice < Number(c.price || 0);
              return (
                <article key={c._id} className="landing-course-card v2">
                  <Link to={`/courses/${c._id}`} className="landing-course-media-link">
                    <div className={`landing-course-banner ${courseThumb ? 'has-thumb' : ''}`}>
                      {courseThumb ? (
                        <img src={courseThumb} alt={c.title} className="landing-course-banner-image" loading="lazy" />
                      ) : (
                        <div className="landing-course-banner-inner">
                          <div>
                            <p className="landing-course-banner-title">
                              {first}
                              {second && (
                                <>
                                  <br />
                                  <em>{second}</em>
                                </>
                              )}
                            </p>
                            <span className="landing-course-join">JOIN OUR COURSE</span>
                          </div>
                          <img className="landing-course-avatar" src={avatar} alt="" width={64} height={64} />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="landing-course-body v2">
                    <div className="landing-course-stars" aria-hidden>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} style={{ opacity: 0.8 }}>
                          ★
                        </span>
                      ))}
                    </div>
                    <h3>
                      <Link to={`/courses/${c._id}`}>{c.title}</Link>
                    </h3>
                    <div className="landing-course-author-line">
                      <span className="landing-author-avatar">
                        {teacherName
                          .split(' ')
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span>
                        By <strong>{teacherName}</strong> in <strong>{categoryLabel(c.category_id)}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="landing-course-footer">
                    <div className="landing-course-price-wrap">
                      <strong className="landing-course-price">${displayPrice.toFixed(2)}</strong>
                      {hasSale && <small className="landing-course-price-old">${Number(c.price).toFixed(2)}</small>}
                    </div>
                    <div className="landing-course-footer-actions">
                      <button type="button" className="landing-mini-icon" aria-label="Save">
                        <Heart size={16} />
                      </button>
                      <Link to={`/courses/${c._id}`} className="landing-mini-icon" aria-label="View course">
                        <Eye size={16} />
                      </Link>
                      <button type="button" className="landing-mini-icon" aria-label="Compare">
                        <Shuffle size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary landing-add-cart-btn"
                        onClick={() => onToggleCart(c._id)}
                      >
                        <ShoppingCart size={16} />
                        {inCart ? 'In cart' : 'Add to cart'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="landing-video-section">
        <div className="landing-inner">
          <div className="landing-video-head">
            <h2>Habka isdiiwaangelinta koorsooyinka</h2>
            <p>
              Raac tilmaamaha hoose si aad u diiwaangeliso koorsooyinka aad rabto — how to search and enroll in
              courses.
            </p>
          </div>
          <div className="landing-video-frame">
            <div className="embed-wrap">
              <iframe
                title="Course registration tutorial"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-inner">
          <h2>Ready to Start Learning?</h2>
          <p>Join over 500+ students and start your journey to success today.</p>
          <div className="landing-cta-buttons">
            <Link to="/register" className="landing-btn-cta-primary">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <a href="#catalog" className="landing-btn-cta-ghost">
              Learn More
            </a>
          </div>
        </div>
      </section>

      <section className="landing-offline-banner">
        <div className="landing-inner landing-offline-inner">
          <div className="landing-offline-text">
            <span className="landing-offline-tag">In-Person Classes</span>
            <h2>Prefer Learning Face-to-Face?</h2>
            <p>
              Register for our offline courses at SSI headquarters in Mogadishu.
              Meet instructors in person, collaborate with peers, and get hands-on guidance.
            </p>
          </div>
          <Link to="/offline-enrollment" className="landing-btn-offline">
            Register for Offline Class <ArrowRight size={17} />
          </Link>
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
                <a href="#catalog">Courses</a>
              </li>
              <li>
                <Link to="/dashboard">Dashboard</Link>
              </li>
              <li>
                <Link to="/events">Events</Link>
              </li>
              <li>
                <Link to="/offline-enrollment">Offline Enrollment</Link>
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
            <a href="#footer-contact">About</a>
            {' · '}
            <a href="#footer-contact">Privacy Policy</a>
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
