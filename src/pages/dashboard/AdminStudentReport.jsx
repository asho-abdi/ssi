import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BookCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flag,
  HelpCircle,
  Mail,
  Star,
  UserCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const EMPTY_REPORT = {
  student: null,
  stats: {
    enrolled_courses: 0,
    completed_courses: 0,
    in_progress_courses: 0,
    reviews_placed: 0,
    total_lessons: 0,
    quizzes_taken: 0,
    assignments: 0,
    questions: 0,
  },
  courses: [],
};

function metric(label, value, Icon, tone = 'blue') {
  return { label, value: Number(value || 0), Icon, tone };
}

export function AdminStudentReport() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(EMPTY_REPORT);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get(`/users/${id}/report`)
      .then((res) => setReport(res.data || EMPTY_REPORT))
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not load student report');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const student = report.student;
  const stats = report.stats || EMPTY_REPORT.stats;
  const statCards = [
    metric('Enrolled Courses', stats.enrolled_courses, BookOpen, 'blue'),
    metric('Completed Courses', stats.completed_courses, CheckCircle2, 'green'),
    metric('In Progress Courses', stats.in_progress_courses, Flag, 'indigo'),
    metric('Reviews Placed', stats.reviews_placed, Star, 'amber'),
    metric('Total Lessons', stats.total_lessons, BookCheck, 'purple'),
    metric('Quizzes', stats.quizzes_taken, HelpCircle, 'sky'),
    metric('Assignments', stats.assignments, ClipboardList, 'teal'),
    metric('Questions', stats.questions, UserCircle2, 'slate'),
  ];

  return (
    <div className="asr-report-root">
      <div className="asr-head-row">
        <div>
          <h1 className="asr-title">Student Report</h1>
        </div>
        <Link to="/dashboard/admin/users/students" className="btn btn-secondary">
          Back to students
        </Link>
      </div>

      {loading && <p className="asr-muted">Loading report...</p>}

      {!loading && student && (
        <>
          <section className="card asr-profile-card">
            <div className="asr-avatar">{student.name?.slice(0, 2).toUpperCase() || 'ST'}</div>
            <div className="asr-profile-body">
              <h2 className="asr-student-name">{student.name}</h2>
              <div className="asr-profile-meta">
                <span className="asr-meta-chip">
                  <Mail size={14} />
                  {student.email}
                </span>
                <span className="asr-meta-chip">
                  <CalendarDays size={14} />
                  Registered at: {new Date(student.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </section>

          <section className="asr-metrics-grid">
            {statCards.map((item) => (
              <article className={`card asr-metric-card tone-${item.tone}`} key={item.label}>
                <div className="asr-metric-top">
                  <span className="asr-icon-wrap">
                    <item.Icon size={18} />
                  </span>
                  <div className="asr-metric-label">{item.label}</div>
                </div>
                <div className="asr-metric-value">{item.value.toLocaleString()}</div>
                <div className="asr-metric-subtext">Current total</div>
              </article>
            ))}
          </section>

          <section className="card" style={{ marginTop: '1rem', padding: 0, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Enroll date</th>
                  <th>Lesson</th>
                  <th>Quiz</th>
                  <th>Assignment</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {report.courses.map((course) => (
                  <tr key={course.order_id}>
                    <td>{course.course_title}</td>
                    <td>{new Date(course.enrolled_at).toLocaleString()}</td>
                    <td>
                      {course.lessons_completed}/{course.lessons_total}
                    </td>
                    <td>{course.quizzes_total}</td>
                    <td>{course.assignments_total}</td>
                    <td>
                      <div className="asr-progress-cell">
                        <div className="asr-progress-bar">
                          <span
                            style={{
                              '--target': `${Math.max(0, Math.min(100, course.progress_percentage || 0))}%`,
                              width: 'var(--target)',
                            }}
                          />
                        </div>
                        <strong className="asr-progress-text">{course.progress_percentage || 0}%</strong>
                      </div>
                    </td>
                  </tr>
                ))}
                {report.courses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="asr-muted">
                      No paid courses for this student yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}

      <style>{`
        .asr-report-root {
          animation: asrFadeIn 0.4s ease-out;
        }
        .asr-muted {
          color: var(--muted);
        }
        .asr-title {
          margin: 0;
          font-size: clamp(1.6rem, 2vw, 2rem);
          letter-spacing: -0.02em;
        }
        .asr-head-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .asr-profile-card {
          margin-top: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.15rem;
          animation: asrRiseIn 0.45s ease-out;
        }
        .asr-avatar {
          width: 62px;
          height: 62px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #2563eb;
          color: #fff;
          font-weight: 700;
          font-size: 1.05rem;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.28);
        }
        .asr-profile-body {
          min-width: 0;
        }
        .asr-student-name {
          margin: 0;
          font-size: clamp(1.15rem, 1.6vw, 1.45rem);
          letter-spacing: -0.01em;
          color: #0f172a;
        }
        .asr-profile-meta {
          margin-top: 0.55rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
          font-size: 0.9rem;
        }
        .asr-meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.3rem 0.6rem;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.08);
          color: #475569;
        }
        .asr-metrics-grid {
          margin-top: 1rem;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.9rem;
        }
        .asr-metric-card {
          padding: 1rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          animation: asrRiseIn 0.5s ease-out;
          transform-origin: center;
        }
        .asr-metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
        }
        .asr-metric-top {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 0.7rem;
        }
        .asr-icon-wrap {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .asr-metric-value {
          font-size: clamp(1.5rem, 2.2vw, 1.95rem);
          line-height: 1;
          font-weight: 800;
          color: #0f172a;
        }
        .asr-metric-label {
          color: var(--muted);
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .asr-metric-subtext {
          margin-top: 0.4rem;
          color: #64748b;
          font-size: 0.82rem;
        }
        .asr-metric-card.tone-blue .asr-icon-wrap {
          background: rgba(37, 99, 235, 0.14);
          color: #1d4ed8;
        }
        .asr-metric-card.tone-green .asr-icon-wrap {
          background: rgba(22, 163, 74, 0.14);
          color: #15803d;
        }
        .asr-metric-card.tone-indigo .asr-icon-wrap {
          background: rgba(79, 70, 229, 0.14);
          color: #4338ca;
        }
        .asr-metric-card.tone-amber .asr-icon-wrap {
          background: rgba(217, 119, 6, 0.14);
          color: #b45309;
        }
        .asr-metric-card.tone-purple .asr-icon-wrap {
          background: rgba(147, 51, 234, 0.14);
          color: #7e22ce;
        }
        .asr-metric-card.tone-sky .asr-icon-wrap {
          background: rgba(14, 165, 233, 0.14);
          color: #0369a1;
        }
        .asr-metric-card.tone-teal .asr-icon-wrap {
          background: rgba(13, 148, 136, 0.14);
          color: #0f766e;
        }
        .asr-metric-card.tone-slate .asr-icon-wrap {
          background: rgba(71, 85, 105, 0.14);
          color: #334155;
        }
        .asr-progress-cell {
          display: flex;
          align-items: center;
          gap: 0.55rem;
        }
        .asr-progress-bar {
          width: 110px;
          height: 7px;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.28);
          overflow: hidden;
        }
        .asr-progress-bar span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #2563eb 0%, #22c55e 100%);
          animation: asrGrowBar 0.9s ease-out;
          transform-origin: left;
        }
        .asr-progress-text {
          font-size: 0.9rem;
          color: #0f172a;
        }
        @keyframes asrFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes asrRiseIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes asrGrowBar {
          from {
            width: 0;
          }
          to {
            width: var(--target);
          }
        }
        @media (max-width: 1100px) {
          .asr-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .asr-metrics-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
