import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BarChart3,
  ChevronDown,
  Clock,
  PlayCircle,
  RefreshCw,
  Star,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { addToCart, getCartIds, removeFromCart } from '../utils/cart';
import { toEmbedSrc } from '../utils/embed';
import { resolveMediaUrl, normalizeImageUrl } from '../utils/mediaUrl';
import './CourseDetail.css';

function splitBannerTitle(title) {
  const words = title.trim().split(/\s+/);
  if (words.length <= 1) return { line1: title, line2: '' };
  const mid = Math.max(1, Math.ceil(words.length / 2));
  return {
    line1: words.slice(0, mid).join(' '),
    line2: words.slice(mid).join(' '),
  };
}

function getCoursePrice(course) {
  const sale = Number(course?.sale_price || 0);
  const regular = Number(course?.price || 0);
  if (Number.isFinite(sale) && sale > 0 && sale < regular) return sale;
  return regular;
}

function levelLabel(level) {
  const value = String(level || '').toLowerCase();
  if (value === 'beginner') return 'Beginner';
  if (value === 'intermediate') return 'Intermediate';
  if (value === 'expert') return 'Expert';
  return 'All levels';
}

export function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], average_rating: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [accOpen, setAccOpen] = useState(true);
  const [enrollmentState, setEnrollmentState] = useState({ loading: true, data: null });
  const [prog, setProg] = useState({ loading: true, data: null });
  const [cartIds, setCartIds] = useState(() => getCartIds());

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#f1f5f9';
    document.body.style.color = '#1e293b';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/reviews/course/${id}`).catch(() => ({ data: { reviews: [], average_rating: 0, count: 0 } })),
    ])
      .then(([c, r]) => {
        if (!cancelled) {
          setCourse(c.data);
          setReviews(r.data);
        }
      })
      .catch(() => toast.error('Could not load course'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !['student', 'admin'].includes(user.role)) {
      setEnrollmentState({ loading: false, data: null });
      setProg({ loading: false, data: null });
      return;
    }
    let cancelled = false;
    setEnrollmentState({ loading: true, data: null });
    setProg({ loading: true, data: null });
    api
      .get(`/enrollments/course/${id}/mine`)
      .then((res) => {
        if (cancelled) return;
        const enrollment = res.data || null;
        setEnrollmentState({ loading: false, data: enrollment });
        if (enrollment?.status === 'approved') {
          api
            .get(`/progress/course/${id}`)
            .then((pRes) => {
              if (!cancelled) setProg({ loading: false, data: pRes.data });
            })
            .catch(() => {
              if (!cancelled) setProg({ loading: false, data: null });
            });
        } else {
          setProg({ loading: false, data: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEnrollmentState({ loading: false, data: null });
          setProg({ loading: false, data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const lessonRows = useMemo(() => {
    if (!course) return [];
    if (course.lessons?.length) {
      return course.lessons.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (course.video_url) {
      return [{ title: 'Introduction', _id: 'intro', order: 0 }];
    }
    return [];
  }, [course]);

  const totalLessons = lessonRows.length || 0;

  const progressPct = useMemo(() => {
    if (!prog.data) return 0;
    return Math.min(100, Math.round(prog.data.progress_percentage ?? 0));
  }, [prog]);

  const completedLessons = useMemo(() => {
    if (!prog.data?.completed_lesson_ids) return 0;
    return prog.data.completed_lesson_ids.length;
  }, [prog]);

  const enrollment = enrollmentState.data;
  const enrollmentStatus = String(enrollment?.status || '').toLowerCase();
  const isApproved = enrollmentStatus === 'approved';
  const isPendingVerification = enrollmentStatus === 'pending_verification';
  const isPending = enrollmentStatus === 'pending';
  const isRejected = enrollmentStatus === 'rejected';

  if (loading || !course) {
    return (
      <div className="cd-page">
        <div className="cd-inner cd-loading">Loading course…</div>
      </div>
    );
  }

  const canBuy = user?.role === 'student' || user?.role === 'admin';
  const showCheckoutActions = !enrollment && (!user || user?.role === 'student' || user?.role === 'admin');
  const { line1, line2 } = splitBannerTitle(course.title);
  const bannerThumbUrl = resolveMediaUrl(course.thumbnail);
  const hasUploadedBanner = Boolean(bannerThumbUrl);
  const bannerThumbOptimized = bannerThumbUrl ? normalizeImageUrl(bannerThumbUrl, { width: 1400, quality: 85 }) : '';
  const previewEmbedSrc = toEmbedSrc(course.video_url || lessonRows[0]?.video_url || '');
  const teacherName = course.teacher_id?.name || 'Instructor';
  const teacherAvatar = normalizeImageUrl(course.teacher_id?.avatar_url, { width: 256, quality: 85 });
  const avatarUrl =
    teacherAvatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=1d3557&color=fff&size=256`;
  const updated = course.updatedAt ? new Date(course.updatedAt) : null;
  const displayPrice = getCoursePrice(course);
  const hasSale = displayPrice < Number(course.price || 0);
  const isInCart = cartIds.includes(String(course._id));

  function onToggleCart() {
    if (isInCart) {
      const updated = removeFromCart(course._id);
      setCartIds(updated);
      toast.success('Removed from cart');
      return;
    }
    const updated = addToCart(course._id);
    setCartIds(updated);
    toast.success('Added to cart');
  }

  return (
    <div className="cd-page">
      <div className="cd-inner">
        <header className="cd-topbar">
          <Link to="/" className="cd-back">
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            Back to courses
          </Link>
        </header>

        <section className={`cd-banner ${previewEmbedSrc ? 'has-video' : ''} ${hasUploadedBanner ? 'has-thumb' : ''}`} aria-label="Course">
          {previewEmbedSrc ? (
            <div className="cd-banner-video-wrap">
              <iframe
                title={`${course.title} preview`}
                src={previewEmbedSrc}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : hasUploadedBanner ? (
            <div
              className="cd-banner-media"
              role="img"
              aria-label={course.title}
              style={{ backgroundImage: `url(${bannerThumbOptimized})` }}
            />
          ) : (
            <div className="cd-banner-inner">
              <div className="cd-banner-copy">
                <h1>
                  {line1}
                  {line2 && <span className="cd-title-line2">{line2}</span>}
                </h1>
                <span className="cd-join-pill">JOIN OUR COURSE</span>
              </div>
              <img className="cd-banner-avatar" src={avatarUrl} alt="" width={120} height={120} />
            </div>
          )}
        </section>

        <div className="cd-layout">
          <main>
            <div className="cd-tabs" role="tablist" aria-label="Course sections">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'info'}
                className={`cd-tab ${tab === 'info' ? 'is-active' : ''}`}
                onClick={() => setTab('info')}
              >
                Course Info
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'reviews'}
                className={`cd-tab ${tab === 'reviews' ? 'is-active' : ''}`}
                onClick={() => setTab('reviews')}
              >
                Reviews
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'announcements'}
                className={`cd-tab ${tab === 'announcements' ? 'is-active' : ''}`}
                onClick={() => setTab('announcements')}
              >
                Announcements
              </button>
            </div>

            {tab === 'info' && (
              <div className="cd-panel" role="tabpanel">
                <p className="cd-desc">{course.description || 'No description provided.'}</p>
                <div className="cd-meta-chips">
                  <span className="cd-meta-chip">
                    <Clock size={17} />
                    {course.duration} hours total
                  </span>
                  {course.teacher_id?.name && (
                    <span className="cd-meta-chip">
                      <User size={17} />
                      Instructor: {course.teacher_id.name}
                    </span>
                  )}
                  <span className="cd-meta-chip cd-star">
                    <Star size={17} fill="currentColor" />
                    {reviews.average_rating ? reviews.average_rating.toFixed(1) : '—'} ({reviews.count} reviews)
                  </span>
                </div>

                <h2 className="cd-section-title">Course Content</h2>
                <div className="cd-acc">
                  <button
                    type="button"
                    className={`cd-acc-trigger ${accOpen ? 'is-open' : ''}`}
                    onClick={() => setAccOpen((o) => !o)}
                    aria-expanded={accOpen}
                  >
                    Chapter 1 — Introduction to the course
                    <ChevronDown size={20} />
                  </button>
                  {accOpen && (
                    <div className="cd-acc-body">
                      {lessonRows.length === 0 && <p className="cd-muted">No lessons listed yet.</p>}
                      {lessonRows.map((lesson, idx) => (
                        <div key={lesson._id || idx} className="cd-lesson-row">
                          <PlayCircle size={18} strokeWidth={2} />
                          <span>
                            {lesson.order != null ? `${lesson.order + 1}. ` : ''}
                            {lesson.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="cd-panel" role="tabpanel">
                {reviews.reviews?.length === 0 ? (
                  <p className="cd-muted">No reviews yet.</p>
                ) : (
                  <ul className="cd-review-list">
                    {reviews.reviews.map((rev) => (
                      <li key={rev._id} className="cd-review-item">
                        <div className="cd-review-head">
                          <strong>{rev.user_id?.name || 'Student'}</strong>
                          <span className="cd-star cd-review-stars">
                            {Array.from({ length: rev.rating || 0 }).map((_, i) => (
                              <Star key={i} size={14} fill="currentColor" />
                            ))}
                          </span>
                        </div>
                        <p className="cd-muted cd-no-margin">
                          {rev.comment}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'announcements' && (
              <div className="cd-panel" role="tabpanel">
                <p className="cd-muted">No announcements.</p>
              </div>
            )}
          </main>

          <aside>
            <div className="cd-side-card">
              <div className="cd-price-wrap">
                <div className="cd-price-tag">${displayPrice.toFixed(2)}</div>
                {hasSale && <div className="cd-price-old">${Number(course.price).toFixed(2)}</div>}
              </div>
              <h3>Course Progress</h3>
              {prog.loading ? (
                <p className="cd-muted cd-no-margin">
                  Loading…
                </p>
              ) : (
                <>
                  <div className="cd-progress-stats">
                    <span>
                      <strong>{completedLessons}</strong> / {totalLessons || '—'}
                    </span>
                    <span>{progressPct}% Complete</span>
                  </div>
                  <div className="cd-progress-bar">
                    <div className="cd-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                </>
              )}
              {isApproved && (
                <>
                  <Link to={`/watch/${course._id}`} className="cd-btn-primary">
                    <PlayCircle size={18} />
                    Start Learning
                  </Link>
                  <Link to={`/watch/${course._id}`} className="cd-btn-outline">
                    Continue course
                  </Link>
                </>
              )}
              {showCheckoutActions && (
                <>
                  {(!user || user?.role === 'student') && (
                    <button type="button" className="cd-btn-outline" onClick={onToggleCart}>
                      {isInCart ? 'Remove from cart' : 'Add to cart'}
                    </button>
                  )}
                  <Link to={canBuy ? `/checkout/${course._id}` : '/login'} className="cd-btn-primary">
                    {isInCart ? 'Checkout now' : 'Checkout'}
                  </Link>
                </>
              )}
              {isPending && <p className="cd-aside-note">Enrollment pending. Submit payment details to continue.</p>}
              {isPendingVerification && <p className="cd-aside-note">Payment proof submitted. Waiting for admin verification.</p>}
              {isRejected && (
                <p className="cd-aside-note">
                  Payment was rejected. <Link to={`/checkout/${course._id}`}>Resubmit proof</Link>.
                </p>
              )}
              {!user && (
                <p className="cd-aside-note">
                  <Link to="/login">Sign in</Link> to continue.
                </p>
              )}
              {user && !isApproved && canBuy && !enrollment && (
                <p className="cd-aside-note">Enrollment required.</p>
              )}
              {user?.role === 'teacher' && (
                <p className="cd-aside-note">Manage from dashboard.</p>
              )}
            </div>

            <div className="cd-side-card">
              <h3>About this course</h3>
              <ul className="cd-meta-list">
                <li>
                  <BarChart3 size={18} strokeWidth={2} />
                  <span>{levelLabel(course.difficulty_level)}</span>
                </li>
                <li>
                  <RefreshCw size={18} strokeWidth={2} />
                  <span>
                    {updated ? `${updated.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} — Last updated` : 'Recently updated'}
                  </span>
                </li>
                <li>
                  <Award size={18} strokeWidth={2} />
                  <span>Certificate of completion</span>
                </li>
              </ul>
            </div>

            <div className="cd-side-card">
              <p className="cd-instructor-label">A course by</p>
              <div className="cd-instructor-row">
                <img src={avatarUrl} alt="" width={52} height={52} />
                <div>
                  <strong>{teacherName}</strong>
                  <span className="cd-muted cd-instructor-subtitle">
                    Instructor
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
