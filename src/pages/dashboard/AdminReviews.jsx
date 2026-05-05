import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);

  async function load() {
    const { data } = await api.get('/reviews/all');
    setReviews(data);
  }

  useEffect(() => {
    load().catch(() => toast.error('Could not load reviews'));
  }, []);

  async function remove(id) {
    if (!confirm('Delete this review?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      toast.success('Review deleted');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    }
  }

  return (
    <div>
      <h1>Reviews</h1>
      <div className="table-wrap card" style={{ marginTop: '1rem', padding: 0, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Rating</th>
              <th>Comment</th>
              <th>Date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r._id}>
                <td>{r.user_id?.name || r.user_id?.email || '—'}</td>
                <td>{r.course_id?.title || '—'}</td>
                <td>{'★'.repeat(r.rating || 0)}</td>
                <td style={{ maxWidth: 340 }}>{r.comment || '—'}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => remove(r._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.95rem;
        }
        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border);
          text-align: left;
          vertical-align: top;
        }
        .data-table th {
          color: var(--muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
