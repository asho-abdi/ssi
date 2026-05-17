import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Bookmark,
  ChevronDown,
  Clock,
  FileText,
  Lock,
  PlayCircle,
  PlaySquare,
  RefreshCw,
  Share2,
  Star,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { addToCart, getCartIds, removeFromCart } from '../utils/cart';
import { toEmbedSrc, getVimeoPageUrl, isVimeoEmbedUrl } from '../utils/embed';
import { formatDurationClock, formatManualLessonDuration } from '../utils/formatDuration';
import { resolveMediaUrl } from '../utils/mediaUrl';
import './CourseDetail.css';

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

function lessonClockLabel(lesson, durationMap) {
  const u = lesson?.video_url?.trim();
  if (u && durationMap[u] != null) return formatDurationClock(durationMap[u]);
  return formatManualLessonDuration(lesson?.duration);
}

export function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], average_rating: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [openModules, setOpenModules] = useState({});
  const [enrollmentState, setEnrollmentState] = useState({ loading: true, data: null });
  const [prog, setProg] = useState({ loading: true, data: null });
  const [cartIds, setCartIds] = useState(() => getCartIds());
  const [videoDurationByUrl, setVideoDurationByUrl] = useState({});

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

  const modules = useMemo(() => {
    if (!course) return [];
    if (course.course_topics?.length) {
      return course.course_topics.map((topic, ti) => ({
        _id: topic._id || `topic-${ti}`,
        title: topic.title || `Module ${ti + 1}`,
        lessons: (topic.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
        resources: topic.resources || [],
      }));
    }
    const flat = course.lessons?.length
      ? course.lessons.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : course.video_url
        ? [{ title: 'Introduction', _id: 'intro', order: 0, video_url: course.video_url }]
        : [];
    const allRes = course.all_resources || [];
    return flat.length || allRes.length
      ? [{ _id: 'chapter-1', title: 'Chapter 1 — Introduction to the course', lessons: flat, resources: allRes }]
      : [];
  }, [course]);

  const lessonRows = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const totalLessons = lessonRows.length;

  const lessonVideoUrlKey = useMemo(
    () =>
      [...new Set(lessonRows.map((l) => String(l?.video_url || '').trim()).filter(Boolean))]
        .sort()
        .join('|'),
    [lessonRows]
  );

  useEffect(() => {
    if (!lessonVideoUrlKey) return;
    const urls = lessonVideoUrlKey.split('|').filter(Boolean);
    if (urls.length === 0) return;
    let cancelled = false;
    api
      .post('/media/video-durations', { urls })
      .then((res) => {
        if (!cancelled) setVideoDurationByUrl(res.data?.durations || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lessonVideoUrlKey]);

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
  const bannerThumbUrl = resolveMediaUrl(course.thumbnail);
  const hasUploadedBanner = Boolean(bannerThumbUrl);
  const previewEmbedSrc = toEmbedSrc(course.video_url || lessonRows[0]?.video_url || '');
  const previewVideoRaw = course.video_url || lessonRows[0]?.video_url || '';
  const vimeoPageUrl = getVimeoPageUrl(previewVideoRaw);
  const showVimeoEmbedHelp = Boolean(previewEmbedSrc && isVimeoEmbedUrl(previewEmbedSrc));
  const teacherName = course.teacher_id?.name || 'Instructor';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=1d3557&color=fff&size=256`;
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

  function toggleModule(id) {
    setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isModuleOpen(id, idx) {
    if (id in openModules) return openModules[id];
    return idx === 0;
  }

  return (
    <div className="cd-page">
      <div className="cd-inner">

        {/* ── Back bar ── */}
        <header className="cd-topbar">
          <Link to="/" className="cd-back">
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            Back to courses
          </Link>
        </header>

        {/* ── Course title header ── */}
        <div className="cd-course-header">
          <div className="cd-course-header-left">
            {course.category_id?.name && (
              <p className="cd-course-cats">
                Categories: <strong>{course.category_id.name}</strong>
              </p>
            )}
            <h1 className="cd-course-title-main">{course.title}</h1>
          </div>
          <div className="cd-course-header-right">
            <button type="button" className="cd-action-btn">
              <Bookmark size={15} /> Wishlist
            </button>
            <button type="button" className="cd-action-btn">
              <Share2 size={15} /> Share
            </button>
          </div>
        </div>

        {/* ── Main split: video left + sidebar right ── */}
        <div className="cd-split-layout">

          {/* ── Left: video + tabs ── */}
          <div className="cd-video-col">

            {/* Video / thumbnail */}
            <div className="cd-video-player">
              {previewEmbedSrc ? (
                <iframe
                  title={`${course.title} preview`}
                  src={previewEmbedSrc}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : hasUploadedBanner ? (
                <div
                  className="cd-video-thumb"
                  role="img"
                  aria-label={course.title}
                  style={{ backgroundImage: `url(${bannerThumbUrl})` }}
                />
              ) : (
                <div className="cd-video-placeholder">
                  <img className="cd-banner-avatar" src={avatarUrl} alt="" width={100} height={100} />
                  <p>{course.title}</p>
                </div>
              )}
            </div>
            {showVimeoEmbedHelp && (
              <div className="cd-vimeo-help" role="note">
                {vimeoPageUrl ? (
                  <a href={vimeoPageUrl} target="_blank" rel="noopener noreferrer">Open on Vimeo</a>
                ) : null}
                {vimeoPageUrl ? <span className="embed-vimeo-help-sep">·</span> : null}
                <span>
                  If playback is blocked, allow embedding for this domain in Vimeo (<strong>Privacy</strong> → where the video can appear). For private videos, use the full share link with <code>?h=…</code>.
                </span>
              </div>
            )}

            {/* Tabs */}
            <div className="cd-tabs" role="tablist" aria-label="Course sections">
              <button type="button" role="tab" aria-selected={tab === 'info'}
                className={`cd-tab ${tab === 'info' ? 'is-active' : ''}`}
                onClick={() => setTab('info')}>Course Info</button>
              <button type="button" role="tab" aria-selected={tab === 'reviews'}
                className={`cd-tab ${tab === 'reviews' ? 'is-active' : ''}`}
                onClick={() => setTab('reviews')}>Reviews</button>
              <button type="button" role="tab" aria-selected={tab === 'announcements'}
                className={`cd-tab ${tab === 'announcements' ? 'is-active' : ''}`}
                onClick={() => setTab('announcements')}>Announcements</button>
            </div>

            {tab === 'info' && (
              <div className="cd-panel" role="tabpanel">

                {/* About Course card */}
                <div className="cd-about-card">
                  <h2 className="cd-about-heading">About Course</h2>
                  <p className="cd-about-desc">{course.description || 'No description provided.'}</p>
                  <div className="cd-about-meta">
                    <div className="cd-about-meta-item">
                      <Clock size={16} />
                      <span><strong>{course.duration}h</strong> total duration</span>
                    </div>
                    {course.teacher_id?.name && (
                      <div className="cd-about-meta-item">
                        <User size={16} />
                        <span>By <strong>{course.teacher_id.name}</strong></span>
                      </div>
                    )}
                    <div className="cd-about-meta-item cd-star">
                      <Star size={16} fill="currentColor" />
                      <span><strong>{reviews.average_rating ? reviews.average_rating.toFixed(1) : '—'}</strong> ({reviews.count} reviews)</span>
                    </div>
                    <div className="cd-about-meta-item">
                      <PlaySquare size={16} />
                      <span><strong>{totalLessons}</strong> lesson{totalLessons !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Course content */}
                <div className="cd-content-section">
                  <h2 className="cd-section-title">Course Content</h2>
                  <p className="cd-content-meta">{totalLessons} lesson{totalLessons !== 1 ? 's' : ''} · {course.duration}h total length</p>
                  {modules.length === 0 && <p className="cd-muted">No content listed yet.</p>}
                  {modules.map((mod, mi) => (
                    <div key={mod._id} className="cd-module">
                      <button
                        type="button"
                        className={`cd-module-header ${isModuleOpen(mod._id, mi) ? 'is-open' : ''}`}
                        onClick={() => toggleModule(mod._id)}
                        aria-expanded={isModuleOpen(mod._id, mi)}
                      >
                        <span className="cd-module-title">{mod.title}</span>
                        <span className="cd-module-count">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
                        <ChevronDown size={18} className="cd-module-chevron" />
                      </button>
                      {isModuleOpen(mod._id, mi) && (
                        <div className="cd-module-body">
                          {mod.lessons.map((lesson, li) => {
                            const clock = lessonClockLabel(lesson, videoDurationByUrl);
                            return (
                            <div key={lesson._id || li} className="cd-lesson-row">
                              <span className="cd-lesson-num">{li + 1}</span>
                              <PlaySquare size={15} className="cd-row-icon" />
                              <span className="cd-row-title">{lesson.title}</span>
                              <span className="cd-lesson-right">
                                {clock && (
                                  <span className="cd-lesson-duration" title="Video length">
                                    {clock}
                                  </span>
                                )}
                                <Lock size={13} className="cd-lock-icon" />
                              </span>
                            </div>
                            );
                          })}
                          {mod.resources.map((res, ri) => (
                            <div key={res._id || ri} className="cd-lesson-row cd-resource-row">
                              <span className="cd-lesson-num">{mod.lessons.length + ri + 1}</span>
                              <FileText size={15} className="cd-row-icon" />
                              <span className="cd-row-title">{res.name}</span>
                              <span className="cd-lesson-right">
                                <Lock size={13} className="cd-lock-icon" />
                              </span>
                            </div>
                          ))}
                          {mod.lessons.length === 0 && mod.resources.length === 0 && (
                            <p className="cd-muted cd-module-empty">No content yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
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
                        <p className="cd-muted cd-no-margin">{rev.comment}</p>
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
          </div>

          {/* ── Right: sidebar ── */}
          <aside className="cd-sidebar">

            {/* Price + buy card */}
            <div className="cd-side-card">
              <div className="cd-price-wrap">
                <span className="cd-price-tag">${displayPrice.toFixed(2)}</span>
                {hasSale && <span className="cd-price-old">${Number(course.price).toFixed(2)}</span>}
              </div>

              {isApproved && (
                <>
                  <div className="cd-progress-stats">
                    <span><strong>{completedLessons}</strong> / {totalLessons || '—'} lessons</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="cd-progress-bar"><div className="cd-progress-fill" style={{ width: `${progressPct}%` }} /></div>
                  <Link to={`/watch/${course._id}`} className="cd-btn-primary">
                    <PlayCircle size={18} /> Start Learning
                  </Link>
                </>
              )}

              {showCheckoutActions && (
                <Link to={canBuy ? `/checkout/${course._id}` : '/login'} className="cd-btn-primary">
                  Add to cart
                </Link>
              )}

              {isPending && <p className="cd-aside-note">Enrollment pending. Submit payment details to continue.</p>}
              {isPendingVerification && <p className="cd-aside-note">Payment proof submitted — waiting for verification.</p>}
              {isRejected && (
                <p className="cd-aside-note">Payment rejected. <Link to={`/checkout/${course._id}`}>Resubmit proof</Link>.</p>
              )}
              {!user && <p className="cd-aside-note"><Link to="/login">Sign in</Link> to continue.</p>}
              {user?.role === 'teacher' && <p className="cd-aside-note">Manage from dashboard.</p>}
            </div>

            {/* Course meta */}
            <div className="cd-side-card">
              <ul className="cd-meta-list">
                <li><BarChart3 size={17} strokeWidth={2} /><span>{levelLabel(course.difficulty_level)}</span></li>
                <li>
                  <RefreshCw size={17} strokeWidth={2} />
                  <span>{updated ? `${updated.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} Last Updated` : 'Recently updated'}</span>
                </li>
                <li><Award size={17} strokeWidth={2} /><span>Certificate of completion</span></li>
              </ul>
            </div>

            {/* Instructor */}
            <div className="cd-side-card">
              <p className="cd-instructor-label">A course by</p>
              <div className="cd-instructor-row">
                <img src={avatarUrl} alt="" width={48} height={48} />
                <strong>{teacherName}</strong>
              </div>
            </div>

            {/* Material includes */}
            <div className="cd-side-card">
              <h3>Material Includes</h3>
              <ul className="cd-meta-list">
                <li><PlaySquare size={17} strokeWidth={2} /><span>Recorded Video</span></li>
                {course.all_resources?.length > 0 && (
                  <li><FileText size={17} strokeWidth={2} /><span>{course.all_resources.length} downloadable resource{course.all_resources.length !== 1 ? 's' : ''}</span></li>
                )}
                <li><Award size={17} strokeWidth={2} /><span>Certificate of completion</span></li>
              </ul>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
