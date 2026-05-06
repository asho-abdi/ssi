import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Clock3, Flame, PlayCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import '../../styles/student-dashboard.css';

function AnimatedProgress({ value }) {
  const trackRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { threshold: 0.12, rootMargin: '0px 0px -8px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={trackRef} className="sd-track">
      <div
        className={`sd-fill ${visible ? 'sd-fill-visible' : ''}`}
        style={{ width: visible ? `${value}%` : '0%' }}
      />
    </div>
  );
}

export function StudentCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function statusMeta(status) {
    const key = String(status || '').toLowerCase();
    if (key === 'approved') return { label: 'Approved', className: 'approved' };
    if (key === 'pending_verification') return { label: 'Pending Verification', className: 'pending' };
    if (key === 'rejected') return { label: 'Rejected', className: 'rejected' };
    return { label: 'Pending', className: 'pending' };
  }

  function normalizeProgress(row) {
    const value = Number(row?.progress_percentage || 0);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  function estimatedDuration(row) {
    const lessons = Number(row?.course_id?.lessons?.length || 0);
    if (lessons <= 0) return 'Self paced';
    const totalMins = lessons * 20;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  function estimatedRating(row) {
    const lessons = Number(row?.course_id?.lessons?.length || 0);
    const rating = 4.2 + Math.min(0.7, lessons * 0.03);
    return rating.toFixed(1);
  }

  useEffect(() => {
    api
      .get('/enrollments/mine')
      .then((res) => setEnrollments(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Could not load enrollments'))
      .finally(() => setLoading(false));
  }, []);

  const continueRow = useMemo(() => {
    return enrollments.find(
      (row) =>
        row.status === 'approved' &&
        row.course_id?._id &&
        normalizeProgress(row) > 0 &&
        normalizeProgress(row) < 100
    );
  }, [enrollments]);

  const approvedCount = useMemo(() => enrollments.filter((row) => row.status === 'approved').length, [enrollments]);
  const avgProgress = useMemo(() => {
    const approved = enrollments.filter((row) => row.status === 'approved');
    if (approved.length === 0) return 0;
    const total = approved.reduce((sum, row) => sum + normalizeProgress(row), 0);
    return Math.round(total / approved.length);
  }, [enrollments]);

  const subtitle = useMemo(() => {
    if (loading) return 'Loading your enrollments…';
    if (continueRow) {
      const p = normalizeProgress(continueRow);
      return `You’re at ${p}% on your latest course — pick up where you left off or browse the grid below.`;
    }
    if (enrollments.length === 0) return 'Enroll in a course to start tracking progress here.';
    return 'Track access, progress, and next steps across your enrolled courses.';
  }, [loading, continueRow, enrollments.length]);

  return (
    <div className="sd-learning">
      <header className="sd-hero">
        <h1 className="sd-hero-title">My Learning</h1>
        <p className="sd-hero-sub">{subtitle}</p>
      </header>

      <div className="sd-stats" aria-live="polite">
        {loading ? (
          <>
            <div className="sd-stat-skel" aria-hidden />
            <div className="sd-stat-skel" aria-hidden />
            <div className="sd-stat-skel" aria-hidden />
          </>
        ) : (
          <>
            <article className="sd-stat-card">
              <span className="sd-stat-value">{enrollments.length}</span>
              <span className="sd-stat-label">Enrolled Courses</span>
            </article>
            <article className="sd-stat-card">
              <span className="sd-stat-value">{approvedCount}</span>
              <span className="sd-stat-label">Approved Access</span>
            </article>
            <article className="sd-stat-card">
              <span className="sd-stat-value">{avgProgress}%</span>
              <span className="sd-stat-label">Average Progress</span>
            </article>
          </>
        )}
      </div>

      {continueRow && (
        <section className="sd-continue" aria-label="Continue learning">
          <div>
            <span className="sd-continue-pill">Continue where you left off</span>
            <h3>{continueRow.course_id?.title || 'Course'}</h3>
            <p>
              {normalizeProgress(continueRow)}% complete · {continueRow.progress_status || 'In progress'}
            </p>
          </div>
          <Link className="btn btn-primary sd-continue-btn" to={`/watch/${continueRow.course_id?._id}`}>
            <PlayCircle size={18} aria-hidden />
            Continue Learning
          </Link>
        </section>
      )}

      <section aria-labelledby="sd-courses-heading">
        <div className="sd-section-head">
          <h2 id="sd-courses-heading" className="sd-section-title">
            Your courses
          </h2>
          <p className="sd-section-sub">Status, pacing, and progress at a glance.</p>
        </div>

        <div className="sd-courses-grid">
          {loading &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`skel-${idx}`} className="sd-skel-card">
                <div className="sd-skel sd-skel-thumb" />
                <div className="sd-skel sd-skel-line" />
                <div className="sd-skel sd-skel-line short" />
                <div className="sd-skel sd-skel-bar" />
                <div className="sd-skel sd-skel-btn" />
              </div>
            ))}
          {!loading &&
            enrollments.map((row) => {
              if (!row.course_id?._id) return null;
              const meta = statusMeta(row.status);
              const approved = row.status === 'approved';
              const progress = normalizeProgress(row);
              const courseId = row.course_id?._id;
              const destination = approved ? `/watch/${courseId}` : `/checkout/${courseId}`;
              const showRecent = continueRow && continueRow._id === row._id;

              return (
                <article
                  key={row._id}
                  className="sd-course-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(destination)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(destination);
                    }
                  }}
                >
                  <div className="sd-thumb-wrap">
                    <img
                      className="sd-thumb"
                      src={
                        resolveMediaUrl(row.course_id?.thumbnail) ||
                        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200'
                      }
                      alt=""
                    />
                    <span className={`sd-badge ${meta.className}`}>{meta.label}</span>
                    {showRecent ? (
                      <span className="sd-recent">
                        <Flame size={13} aria-hidden />
                        Recently accessed
                      </span>
                    ) : null}
                  </div>
                  <div className="sd-card-body">
                    <h3 className="sd-course-title">{row.course_id?.title || 'Course'}</h3>
                    <p className="sd-enroll-date">Enrolled {new Date(row.createdAt).toLocaleDateString()}</p>

                    <div className="sd-meta">
                      <span>
                        <Star size={14} aria-hidden />
                        {estimatedRating(row)}
                      </span>
                      <span>
                        <Clock3 size={14} aria-hidden />
                        {estimatedDuration(row)}
                      </span>
                      <span>
                        <BookOpenCheck size={14} aria-hidden />
                        {Number(row.course_id?.lessons?.length || 0)} lessons
                      </span>
                    </div>

                    <div className="sd-progress-block">
                      <div className="sd-progress-top">
                        <span>{approved ? row.progress_status || 'Not started' : 'Awaiting approval'}</span>
                        <strong>{approved ? `${progress}%` : '0%'}</strong>
                      </div>
                      <AnimatedProgress value={approved ? progress : 0} />
                    </div>

                    <div className="sd-cta-row">
                      {approved ? (
                        <Link
                          to={destination}
                          className="btn btn-primary sd-cta"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <PlayCircle size={16} aria-hidden />
                          Continue
                          <ArrowRight size={16} aria-hidden />
                        </Link>
                      ) : (
                        <Link
                          to={destination}
                          className="btn btn-secondary sd-cta"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Complete payment
                          <ArrowRight size={16} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>

      {!loading && enrollments.length === 0 && (
        <div className="sd-empty">
          <h3>No courses yet</h3>
          <p>Browse the catalog and enroll to see your learning hub fill in.</p>
          <Link className="btn btn-primary" to="/">
            Browse courses
          </Link>
        </div>
      )}
    </div>
  );
}
