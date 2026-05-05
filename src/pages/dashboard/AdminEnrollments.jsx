import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { DashboardPage, SectionCard, SummaryCard, SummaryGrid } from '../../components/dashboard/DashboardUI';
import { DashboardPagination, DashboardTable } from '../../components/dashboard/DashboardTable';

export function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [granting, setGranting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [grantForm, setGrantForm] = useState({
    student_id: '',
    course_id: '',
    amount: '',
  });

  async function load() {
    const [enrollmentRes, studentsRes, coursesRes] = await Promise.all([
      api.get('/enrollments/all'),
      api.get('/users', { params: { role: 'student' } }),
      api.get('/courses'),
    ]);
    const enrollmentRows = Array.isArray(enrollmentRes.data) ? enrollmentRes.data : [];
    const studentRows = Array.isArray(studentsRes.data) ? studentsRes.data : [];
    const courseRows = Array.isArray(coursesRes.data) ? coursesRes.data : [];
    setEnrollments(enrollmentRows);
    setStudents(studentRows);
    setCourses(courseRows);
    setGrantForm((prev) => ({
      student_id: prev.student_id || studentRows[0]?._id || '',
      course_id: prev.course_id || courseRows[0]?._id || '',
      amount: prev.amount,
    }));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch(() => {
        if (!cancelled) toast.error('Failed to load enrollment data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ordered = useMemo(
    () => [...enrollments].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)),
    [enrollments]
  );
  const visibleRows = useMemo(() => {
    if (!search.trim()) return ordered;
    const q = search.trim().toLowerCase();
    return ordered.filter((row) => {
      const student = `${row?.student_id?.name || ''} ${row?.student_id?.email || ''}`.toLowerCase();
      const course = String(row?.course_id?.title || '').toLowerCase();
      const status = String(row?.status || '').toLowerCase();
      return student.includes(q) || course.includes(q) || status.includes(q);
    });
  }, [ordered, search]);
  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = visibleRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  function statusMeta(status) {
    const key = String(status || '').toLowerCase();
    if (key === 'approved') return { label: 'Approved', className: 'approved' };
    if (key === 'pending_verification') return { label: 'Pending Verification', className: 'pending-verification' };
    if (key === 'rejected') return { label: 'Rejected', className: 'rejected' };
    return { label: 'Pending', className: 'pending' };
  }

  async function review(row, action) {
    if (acting) return;
    const admin_note = window.prompt(`Optional note for ${action}:`, '') || '';
    setActing(`${row._id}-${action}`);
    try {
      const { data } = await api.patch(`/enrollments/${row._id}/review`, { action, admin_note });
      toast.success(data?.message || 'Enrollment updated');
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update enrollment');
    } finally {
      setActing('');
    }
  }

  async function grantAccess(e) {
    e.preventDefault();
    if (granting) return;
    if (!grantForm.student_id || !grantForm.course_id) {
      toast.error('Select both student and course');
      return;
    }
    const payload = {
      course_id: grantForm.course_id,
    };
    if (grantForm.amount !== '') payload.amount = Number(grantForm.amount);
    setGranting(true);
    try {
      const { data } = await api.post(`/users/${grantForm.student_id}/grant-course`, payload);
      toast.success(data?.message || 'Course access granted');
      setGrantForm((prev) => ({ ...prev, amount: '' }));
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant course access');
    } finally {
      setGranting(false);
    }
  }

  return (
    <DashboardPage title="Enrollments" subtitle="Review manual payments and approve or reject course access.">
      <SummaryGrid>
        <SummaryCard label="Total Enrollments" value={ordered.length} />
        <SummaryCard label="Pending Review" value={ordered.filter((row) => String(row.status).toLowerCase().includes('pending')).length} />
        <SummaryCard label="Approved" value={ordered.filter((row) => String(row.status).toLowerCase() === 'approved').length} />
      </SummaryGrid>

      <SectionCard title="Grant Course Access" subtitle="Manually grant a paid or free course to any student account.">
        <form className="enroll-grant-form" onSubmit={grantAccess}>
          <div>
            <label className="label">Student</label>
            <select
              className="input"
              value={grantForm.student_id}
              onChange={(e) => setGrantForm((prev) => ({ ...prev, student_id: e.target.value }))}
              required
            >
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} ({student.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Course</label>
            <select
              className="input"
              value={grantForm.course_id}
              onChange={(e) => setGrantForm((prev) => ({ ...prev, course_id: e.target.value }))}
              required
            >
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount (optional)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={grantForm.amount}
              onChange={(e) => setGrantForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="Use course price by default"
            />
          </div>
          <div className="enroll-grant-submit">
            <button type="submit" className="btn btn-primary" disabled={granting || students.length === 0 || courses.length === 0}>
              {granting ? 'Granting...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </SectionCard>

      <DashboardTable
        title="All Enrollments"
        actions={
          <input
            className="input enroll-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search student, course, status..."
          />
        }
      >
        {loading && <p className="enroll-subtle">Loading...</p>}
        <div className="table-wrap">
          <table className="data-table enroll-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Status</th>
                <th>Payment proof</th>
                <th>Transaction ID</th>
                <th>Progress</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const meta = statusMeta(row.status);
                const pendingReview = row.status === 'pending_verification' || row.status === 'pending';
                return (
                <tr key={row._id}>
                  <td>{row.student_id?.name || row.student_id?.email || '—'}</td>
                  <td>{row.course_id?.title || '—'}</td>
                  <td>
                    <span className={`status-badge ${meta.className}`}>{meta.label}</span>
                  </td>
                  <td>
                    {row.payment_proof_url ? (
                      <a href={row.payment_proof_url} target="_blank" rel="noreferrer" className="enroll-proof-link">
                        View proof
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{row.transaction_id || '—'}</td>
                  <td>{row.status === 'approved' ? `${Number(row.progress_percentage || 0)}% (${row.progress_status || 'Not Started'})` : '—'}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    {pendingReview ? (
                      <div className="enroll-row-actions">
                        <button type="button" className="btn btn-primary" onClick={() => review(row, 'approve')} disabled={acting === `${row._id}-approve`}>
                          {acting === `${row._id}-approve` ? 'Approving...' : 'Approve'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => review(row, 'reject')} disabled={acting === `${row._id}-reject`}>
                          {acting === `${row._id}-reject` ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )})}
              {pagedRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="enroll-subtle">
                    No enrollments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DashboardPagination
          page={safePage}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      </DashboardTable>

      <style>{`
        .enroll-subtle {
          margin-top: 0.35rem;
          color: var(--muted);
        }
        .enroll-search {
          min-width: 280px;
        }
        .table-wrap {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: auto;
        }
        .enroll-table {
          min-width: 980px;
        }
        .enroll-grant-form {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.7rem;
          align-items: end;
        }
        .enroll-grant-submit {
          display: flex;
          justify-content: flex-start;
        }
        .enroll-grant-submit .btn {
          min-width: 170px;
        }
        .status-badge {
          border-radius: 999px;
          padding: 0.16rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .status-badge.pending-verification {
          background: #dbeafe;
          color: #1d4ed8;
        }
        .status-badge.approved {
          background: #dcfce7;
          color: #166534;
        }
        .status-badge.rejected {
          background: #fee2e2;
          color: #b91c1c;
        }
        .enroll-row-actions {
          display: inline-flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .enroll-proof-link {
          color: #1d4ed8;
          font-weight: 600;
          text-decoration: none;
        }
        .enroll-proof-link:hover {
          text-decoration: underline;
        }
        @media (max-width: 980px) {
          .enroll-grant-form {
            grid-template-columns: 1fr;
          }
          .enroll-search {
            min-width: 0;
            width: 100%;
          }
        }
      `}</style>
    </DashboardPage>
  );
}
