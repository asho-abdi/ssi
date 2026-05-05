import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { DashboardPage, SectionCard } from '../../components/dashboard/DashboardUI';

const ROLES = ['admin', 'teacher', 'editor', 'student'];

export function AdminAnnouncements() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    audience_roles: [...ROLES],
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/announcements/admin');
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load announcements');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleAudience(role) {
    setForm((f) => {
      const set = new Set(f.audience_roles);
      if (set.has(role)) set.delete(role);
      else set.add(role);
      const next = ROLES.filter((r) => set.has(r));
      return { ...f, audience_roles: next.length ? next : [...ROLES] };
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    const title = form.title.trim();
    const message = form.message.trim();
    if (!title || !message) {
      toast.error('Title and message are required');
      return;
    }
    try {
      await api.post('/announcements/admin', {
        title,
        message,
        priority: form.priority,
        audience_roles: form.audience_roles,
        is_active: form.is_active,
      });
      toast.success('Announcement created');
      setForm({
        title: '',
        message: '',
        priority: 'normal',
        audience_roles: [...ROLES],
        is_active: true,
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create');
    }
  }

  async function toggleActive(row) {
    try {
      await api.patch(`/announcements/admin/${row._id}`, { is_active: !row.is_active });
      toast.success(row.is_active ? 'Deactivated' : 'Activated');
      load();
    } catch {
      toast.error('Update failed');
    }
  }

  async function removeRow(id) {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/admin/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <DashboardPage title="Announcements" subtitle="Dashboard notices shown to selected roles">
      <SectionCard title="New announcement">
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1rem', maxWidth: '640px' }}>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>Title</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={140}
              required
            />
          </label>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>Message</span>
            <textarea
              className="input"
              rows={4}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              maxLength={2000}
              required
            />
          </label>
          <label>
            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>Priority</span>
            <select
              className="input"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
            </select>
          </label>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Audience</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {ROLES.map((role) => (
                <label key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="checkbox"
                    checked={form.audience_roles.includes(role)}
                    onChange={() => toggleAudience(role)}
                  />
                  {role}
                </label>
              ))}
            </div>
          </fieldset>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <button type="submit" className="btn btn-primary">
            Publish
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Existing">
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>No announcements yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
            {rows.map((row) => (
              <li key={row._id} className="card card--static" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <strong>{row.title}</strong>
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--muted)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {row.priority}
                    </span>
                    {!row.is_active ? (
                      <span style={{ marginLeft: '0.5rem', color: '#dc2626', fontSize: '0.85rem' }}>inactive</span>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => toggleActive(row)}>
                      {row.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => removeRow(row._id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{row.message}</p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Audience: {(row.audience_roles || []).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </DashboardPage>
  );
}
