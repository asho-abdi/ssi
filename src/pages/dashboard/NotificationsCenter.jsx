import { useEffect, useState } from 'react';
import api from '../../api/client';

export function NotificationsCenter() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/notifications', { params: { limit: 120 } });
      setItems(Array.isArray(data?.rows) ? data.rows : []);
      setUnreadCount(Number(data?.unread_count || 0));
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markOneRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((item) => (item._id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.post('/notifications/read-all');
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true, read_at: item.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {}
  }

  return (
    <section className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Notification Center</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)' }}>Unread: {unreadCount}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={markAllRead} disabled={unreadCount === 0}>
          Mark all as read
        </button>
      </div>
      <div style={{ marginTop: '0.9rem', display: 'grid', gap: '0.6rem' }}>
        {loading ? <p style={{ color: 'var(--muted)' }}>Loading...</p> : null}
        {!loading && items.length === 0 ? <p style={{ color: 'var(--muted)' }}>No notifications yet.</p> : null}
        {items.map((item) => (
          <article
            key={item._id}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '0.75rem',
              background: item.is_read ? 'var(--bg-elevated)' : 'color-mix(in srgb, var(--primary) 6%, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.7rem' }}>
              <div>
                <strong style={{ display: 'block' }}>{item.title}</strong>
                <p style={{ margin: '0.3rem 0 0', color: '#334155' }}>{item.message}</p>
                <small style={{ color: 'var(--muted)' }}>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
              <div style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                {!item.is_read ? (
                  <button type="button" className="btn btn-ghost" onClick={() => markOneRead(item._id)}>
                    Mark read
                  </button>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Read</span>
                )}
                {item.link ? (
                  <a href={item.link} className="btn btn-secondary">
                    Open
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
