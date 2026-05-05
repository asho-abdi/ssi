import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

export function AdminPayments() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api
      .get('/orders/all')
      .then((res) => setOrders(res.data))
      .catch(() => toast.error('Could not load payments'));
  }, []);

  return (
    <div>
      <h1>Payments</h1>
      <div className="table-wrap card" style={{ marginTop: '1rem', padding: 0, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Course</th>
              <th>Total</th>
              <th>Instructor</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id}>
                <td>{o.user_id?.name || o.user_id?.email}</td>
                <td>
                  {o.course_id?.title ? (
                    <Link to={`/courses/${o.course_id._id}`}>{o.course_id.title}</Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td>${Number(o.amount).toFixed(2)}</td>
                <td>${Number(o.instructor_earning || 0).toFixed(2)}</td>
                <td>${Number(o.admin_earning || 0).toFixed(2)}</td>
                <td>
                  <span className={`pill ${o.status}`}>{o.status}</span>
                </td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .data-table td:nth-child(3) {
          font-weight: 700;
          color: #1d3557;
        }
      `}</style>
    </div>
  );
}
