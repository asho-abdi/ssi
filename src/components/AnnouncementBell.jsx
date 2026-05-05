import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { HeaderBellButton } from './dashboard/DashboardUI';

function toMillis(value) {
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}

export function AnnouncementBell({ storageKey = 'announcements_seen_at' }) {
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seenAt, setSeenAt] = useState(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? Number(raw) || 0 : 0;
  });
  const rootRef = useRef(null);

  const unreadAnnouncements = useMemo(
    () => announcements.filter((item) => toMillis(item.createdAt) > seenAt).length,
    [announcements, seenAt]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );
  const unreadCount = unreadAnnouncements + unreadNotifications;

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    api
      .get('/announcements')
      .then((res) => {
        if (canceled) return;
        setAnnouncements(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!canceled) setAnnouncements([]);
      });
    api
      .get('/notifications', { params: { limit: 15 } })
      .then((res) => {
        if (canceled) return;
        setNotifications(Array.isArray(res.data?.rows) ? res.data.rows : []);
      })
      .catch(() => {
        if (!canceled) setNotifications([]);
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    function onDocClick(event) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function onToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      setSeenAt(now);
      localStorage.setItem(storageKey, String(now));
    }
  }

  async function markNotificationRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, is_read: true } : item)));
    } catch {}
  }

  return (
    <div className="ann-bell-root" ref={rootRef}>
      <HeaderBellButton onClick={onToggle} count={unreadCount} />
      {open ? (
        <div className="ann-bell-panel card card--static">
          <div className="ann-bell-head">
            <strong>Notifications</strong>
            <span>{loading ? 'Loading...' : `${announcements.length + notifications.length} total`}</span>
          </div>
          <div className="ann-bell-list">
            {!loading && announcements.length === 0 && notifications.length === 0 ? (
              <p className="ann-bell-empty">No notifications right now.</p>
            ) : null}
            {notifications.map((item) => (
              <article key={`notif-${item._id}`} className={`ann-bell-item ${item.is_read ? '' : 'is-unread'}`}>
                <div className="ann-bell-item-top">
                  <strong>{item.title}</strong>
                  {!item.is_read ? <span className="ann-priority high">new</span> : null}
                </div>
                <p>{item.message}</p>
                <div className="ann-item-actions">
                  <time>{new Date(item.createdAt).toLocaleString()}</time>
                  {!item.is_read ? (
                    <button type="button" className="ann-mini-btn" onClick={() => markNotificationRead(item._id)}>
                      Mark read
                    </button>
                  ) : null}
                  {item.link ? (
                    <a href={item.link} className="ann-mini-btn">
                      Open
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
            {announcements.map((item) => (
              <article key={item._id} className="ann-bell-item">
                <div className="ann-bell-item-top">
                  <strong>{item.title}</strong>
                  <span className={`ann-priority ${item.priority || 'normal'}`}>{item.priority || 'normal'}</span>
                </div>
                <p>{item.message}</p>
                <time>{new Date(item.createdAt).toLocaleString()}</time>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      <style>{`
        .ann-bell-root {
          position: relative;
        }
        .ann-bell-panel {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: min(420px, 88vw);
          max-height: 420px;
          z-index: 40;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 12px;
        }
        .ann-bell-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 0.72rem;
          border-bottom: 1px solid var(--border);
          background: #fff;
        }
        .ann-bell-head span {
          font-size: 0.76rem;
          color: var(--muted);
        }
        .ann-bell-list {
          overflow: auto;
          padding: 0.5rem;
          display: grid;
          gap: 0.45rem;
          background: #fff;
        }
        .ann-bell-empty {
          margin: 0.42rem;
          color: var(--muted);
          font-size: 0.82rem;
        }
        .ann-bell-item {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.5rem 0.55rem;
          background: var(--bg-elevated);
          display: grid;
          gap: 0.3rem;
        }
        .ann-bell-item.is-unread {
          border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
          background: color-mix(in srgb, var(--primary) 7%, var(--bg-elevated));
        }
        .ann-bell-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .ann-bell-item p {
          margin: 0;
          color: #334155;
          font-size: 0.81rem;
          line-height: 1.45;
        }
        .ann-bell-item time {
          color: var(--muted);
          font-size: 0.72rem;
        }
        .ann-item-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .ann-mini-btn {
          border: 1px solid var(--border);
          background: #fff;
          color: #334155;
          border-radius: 8px;
          padding: 0.12rem 0.4rem;
          font-size: 0.72rem;
          text-decoration: none;
          cursor: pointer;
        }
        .ann-priority {
          font-size: 0.68rem;
          text-transform: uppercase;
          font-weight: 700;
          padding: 0.12rem 0.36rem;
          border-radius: 999px;
          border: 1px solid transparent;
        }
        .ann-priority.high {
          color: #b91c1c;
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.2);
        }
        .ann-priority.normal {
          color: #1d4ed8;
          background: rgba(29, 78, 216, 0.08);
          border-color: rgba(29, 78, 216, 0.2);
        }
        .ann-priority.low {
          color: #166534;
          background: rgba(22, 101, 52, 0.08);
          border-color: rgba(22, 101, 52, 0.2);
        }
      `}</style>
    </div>
  );
}
