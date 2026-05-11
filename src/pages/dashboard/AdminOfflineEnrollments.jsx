import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, UserCheck, Search, ChevronDown, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const EMPTY_FORM = { fullName: '', email: '', phone: '', courseId: '' };

export function AdminOfflineEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  // Registration form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [formPrice, setFormPrice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const [enrRes, courseRes] = await Promise.all([
        api.get('/offline-enrollments'),
        api.get('/courses'),
      ]);
      setEnrollments(enrRes.data || []);
      setCourses(courseRes.data || []);
    } catch {
      toast.error('Could not load offline enrollments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onCourseChange(e) {
    const id = e.target.value;
    setForm((f) => ({ ...f, courseId: id }));
    const found = courses.find((c) => c._id === id);
    if (found) {
      const sale = Number(found.sale_price || 0);
      const regular = Number(found.price || 0);
      setFormPrice(sale > 0 && sale < regular ? sale : regular);
    } else {
      setFormPrice(null);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.courseId) {
      toast.error('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/offline-enrollments', form);
      toast.success('Student registered successfully');
      setForm(EMPTY_FORM);
      setFormPrice(null);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(id) {
    try {
      await api.put(`/offline-enrollments/${id}`, { paymentStatus: 'paid' });
      toast.success('Marked as paid');
      setEnrollments((prev) =>
        prev.map((e) => (e._id === id ? { ...e, paymentStatus: 'paid' } : e))
      );
    } catch {
      toast.error('Update failed');
    }
  }

  async function markAttended(id) {
    try {
      await api.put(`/offline-enrollments/${id}`, { status: 'attended' });
      toast.success('Marked as attended');
      setEnrollments((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status: 'attended' } : e))
      );
    } catch {
      toast.error('Update failed');
    }
  }

  const filtered = useMemo(() => {
    let list = [...enrollments];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.fullName?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q) ||
          e.phone?.includes(q)
      );
    }
    if (filterCourse) {
      list = list.filter((e) => String(e.courseId) === filterCourse);
    }
    return list;
  }, [enrollments, search, filterCourse]);

  const stats = useMemo(() => ({
    total: enrollments.length,
    paid: enrollments.filter((e) => e.paymentStatus === 'paid').length,
    attended: enrollments.filter((e) => e.status === 'attended').length,
    pending: enrollments.filter((e) => e.paymentStatus === 'pending').length,
  }), [enrollments]);

  return (
    <div>
      {/* Header */}
      <div className="oea-head">
        <div>
          <h1>Offline Enrollments</h1>
          <p style={{ color: 'var(--muted)', margin: '0.25rem 0 0' }}>
            Register and manage in-person class students.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const next = !showForm;
            setShowForm(next);
            if (next) { setFormOpen(true); setForm(EMPTY_FORM); setFormPrice(null); }
          }}
        >
          <UserPlus size={15} />
          {showForm ? 'Close form' : 'Register Student'}
        </button>
      </div>

      {/* Stats */}
      <div className="oea-stats">
        <div className="oea-stat-card">
          <span className="oea-stat-num">{stats.total}</span>
          <span className="oea-stat-label">Total Registered</span>
        </div>
        <div className="oea-stat-card oea-stat-paid">
          <span className="oea-stat-num">{stats.paid}</span>
          <span className="oea-stat-label">Paid</span>
        </div>
        <div className="oea-stat-card oea-stat-pending">
          <span className="oea-stat-num">{stats.pending}</span>
          <span className="oea-stat-label">Pending Payment</span>
        </div>
        <div className="oea-stat-card oea-stat-attended">
          <span className="oea-stat-num">{stats.attended}</span>
          <span className="oea-stat-label">Attended</span>
        </div>
      </div>

      {/* Layout: form + table */}
      <div className="oea-layout" style={{ gridTemplateColumns: showForm ? '320px minmax(0,1fr)' : 'minmax(0,1fr)' }}>

        {/* Registration form panel */}
        {showForm && (
          <form className="card oea-form-panel" onSubmit={onSubmit}>
            <div className="oea-form-head">
              <h3>Register Student</h3>
              <button
                type="button"
                className="btn btn-ghost oea-collapse-btn"
                onClick={() => setFormOpen((v) => !v)}
                aria-expanded={formOpen}
              >
                <ChevronDown size={15} className={formOpen ? 'oea-chevron-open' : ''} />
              </button>
            </div>

            <div className={`oea-form-wrap ${formOpen ? 'is-open' : ''}`}>
              <div className="oea-form-inner">
                <div className="oea-field">
                  <label className="label">Full Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Mohamed Ali"
                    value={form.fullName}
                    onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="oea-field">
                  <label className="label">Email Address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="e.g. student@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="oea-field">
                  <label className="label">Phone Number</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="e.g. +252 61 5942611"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>

                <div className="oea-field">
                  <label className="label">Course</label>
                  <select className="input" value={form.courseId} onChange={onCourseChange} required>
                    <option value="">— Select course —</option>
                    {courses.map((c) => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {formPrice !== null && (
                  <div className="oea-price-row">
                    <span>Course fee</span>
                    <strong>${Number(formPrice).toFixed(2)}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={submitting} style={{ flex: 1 }}>
                    {submitting ? 'Registering…' : 'Register'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => { setForm(EMPTY_FORM); setFormPrice(null); }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Table side */}
        <div>
          {/* Filters */}
          <div className="oea-toolbar">
            <div className="oea-search-wrap">
              <Search size={15} className="oea-search-icon" />
              <input
                className="input oea-search"
                placeholder="Search by name, email or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={{ minWidth: 200 }}
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c._id} value={c._id}>{c.title}</option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={load}>
              Refresh
            </button>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'auto', marginTop: '0.75rem' }}>
            <table className="oea-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Phone</th>
                  <th>Course</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="oea-empty">Loading…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={8} className="oea-empty">No enrollments found.</td></tr>
                )}
                {filtered.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <div className="oea-student-name">{e.fullName}</div>
                      <div className="oea-student-email">{e.email}</div>
                    </td>
                    <td>{e.phone}</td>
                    <td className="oea-course-cell">{e.courseTitle || '—'}</td>
                    <td>${Number(e.price || 0).toFixed(2)}</td>
                    <td>
                      <span className={`oea-badge ${e.paymentStatus === 'paid' ? 'oea-badge-paid' : 'oea-badge-pending'}`}>
                        {e.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span className={`oea-badge ${e.status === 'attended' ? 'oea-badge-attended' : 'oea-badge-registered'}`}>
                        {e.status === 'attended' ? 'Attended' : 'Registered'}
                      </span>
                    </td>
                    <td className="oea-date">
                      {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="oea-actions">
                        {e.paymentStatus !== 'paid' && (
                          <button
                            type="button"
                            className="btn btn-ghost oea-action-btn"
                            onClick={() => markPaid(e._id)}
                          >
                            <CheckCircle2 size={14} />
                            Paid
                          </button>
                        )}
                        {e.status !== 'attended' && (
                          <button
                            type="button"
                            className="btn btn-ghost oea-action-btn"
                            onClick={() => markAttended(e._id)}
                          >
                            <UserCheck size={14} />
                            Attended
                          </button>
                        )}
                        {e.paymentStatus === 'paid' && e.status === 'attended' && (
                          <span className="oea-complete-label">
                            <CheckCircle2 size={13} /> Complete
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .oea-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .oea-head h1 { margin: 0; }
        .oea-head .btn { display: inline-flex; align-items: center; gap: 0.4rem; }

        .oea-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .oea-stat-card {
          background: #fff;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 1rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }
        .oea-stat-num { font-size: 1.6rem; font-weight: 700; color: #1d3557; line-height: 1; }
        .oea-stat-label { font-size: 0.8rem; color: var(--muted); }
        .oea-stat-paid .oea-stat-num { color: #16a34a; }
        .oea-stat-pending .oea-stat-num { color: #d97706; }
        .oea-stat-attended .oea-stat-num { color: #2563eb; }

        /* Two-column layout */
        .oea-layout {
          display: grid;
          gap: 1rem;
          align-items: start;
        }

        /* Form panel */
        .oea-form-panel { padding: 1rem 1.15rem 1.15rem; }
        .oea-form-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .oea-form-head h3 { margin: 0; font-size: 1rem; }
        .oea-collapse-btn {
          min-height: 30px;
          min-width: 30px;
          padding: 0;
          justify-content: center;
        }
        .oea-collapse-btn svg { transition: transform 0.2s; }
        .oea-chevron-open { transform: rotate(180deg); }

        .oea-form-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.22s ease;
        }
        .oea-form-wrap.is-open { grid-template-rows: 1fr; }
        .oea-form-inner {
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding-top: 0.85rem;
        }

        .oea-field { display: flex; flex-direction: column; gap: 0.3rem; }

        .oea-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 7px;
          padding: 0.55rem 0.85rem;
          font-size: 0.88rem;
          color: #0369a1;
        }
        .oea-price-row strong { font-size: 1rem; }

        /* Toolbar */
        .oea-toolbar {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .oea-search-wrap { position: relative; flex: 1; min-width: 180px; }
        .oea-search-icon {
          position: absolute;
          left: 0.7rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .oea-search { padding-left: 2.1rem !important; width: 100%; box-sizing: border-box; }

        /* Table */
        .oea-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .oea-table th,
        .oea-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border, #e2e8f0);
          text-align: left;
          white-space: nowrap;
        }
        .oea-table th {
          color: var(--muted);
          font-weight: 600;
          font-size: 0.82rem;
          background: #f8fafc;
        }
        .oea-table tbody tr:hover { background: #f8fafc; }
        .oea-table tbody tr:last-child td { border-bottom: none; }

        .oea-student-name { font-weight: 600; color: #1e293b; }
        .oea-student-email { font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }
        .oea-course-cell { max-width: 180px; white-space: normal; }
        .oea-date { color: #94a3b8; font-size: 0.84rem; }

        .oea-badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 20px;
          font-size: 0.78rem;
          font-weight: 600;
        }
        .oea-badge-paid { background: #dcfce7; color: #16a34a; }
        .oea-badge-pending { background: #fef9c3; color: #a16207; }
        .oea-badge-attended { background: #dbeafe; color: #1d4ed8; }
        .oea-badge-registered { background: #f1f5f9; color: #475569; }

        .oea-actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
        .oea-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          padding: 0.28rem 0.55rem;
          min-height: 30px;
          white-space: nowrap;
        }
        .oea-complete-label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
          color: #16a34a;
          font-weight: 600;
        }
        .oea-empty {
          text-align: center;
          color: var(--muted);
          padding: 2rem !important;
        }

        @media (max-width: 900px) {
          .oea-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
