import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { AppImage } from '../../components/common/AppImage';
import { PERMISSION_CATALOG, resolvePermissions } from '../../utils/permissions';

const FILTER_PAGE_LABEL = {
  student: 'All Students',
  teacher: 'All Instructors',
  editor: 'All Editors',
};
const ROLE_SINGLE_LABEL = {
  student: 'Student',
  teacher: 'Instructor',
  editor: 'Editor',
};

function normalizeFilter(value) {
  return ['student', 'teacher', 'editor'].includes(value) ? value : 'student';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function initials(name) {
  return String(name || 'U')
    .split(' ')
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
}

function roleDisplay(role) {
  if (String(role || '').toLowerCase() === 'teacher') return 'instructor';
  return String(role || '');
}

function resolveAvatarUrl(user) {
  return (
    user?.avatar_url ||
    user?.avatarUrl ||
    user?.profileImage ||
    user?.profile_image ||
    user?.profile?.avatarUrl ||
    user?.profile?.avatar_url ||
    user?.avatar ||
    ''
  );
}

function defaultCreateForm(role) {
  return {
    firstName: '',
    secondName: '',
    username: '',
    phone: '',
    email: '',
    teacherFee: '',
    password: '',
    confirmPassword: '',
    permissions: resolvePermissions(role, {}),
  };
}

function groupedPermissionCatalog() {
  return PERMISSION_CATALOG.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

export function AdminUsers({ initialRoleFilter = 'student' }) {
  const [roleFilter, setRoleFilter] = useState(() => normalizeFilter(initialRoleFilter));
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', teacherFee: '', permissions: resolvePermissions('student', {}) });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createForm, setCreateForm] = useState(() => defaultCreateForm(roleFilter));

  useEffect(() => {
    setRoleFilter(normalizeFilter(initialRoleFilter));
  }, [initialRoleFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/users', { params: { role: roleFilter } })
      .then((res) => {
        if (!cancelled) setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load users');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roleFilter]);

  const pageTitle = FILTER_PAGE_LABEL[roleFilter] || 'All Students';
  const roleLabel = ROLE_SINGLE_LABEL[roleFilter] || 'Student';
  const showReportAction = roleFilter === 'student';
  const showManageActions = ['student', 'teacher', 'editor'].includes(roleFilter);
  const canManageCustomPermissions = ['teacher', 'editor'].includes(roleFilter);
  const emptyLabel = useMemo(() => {
    if (roleFilter === 'teacher') return 'No instructors found.';
    if (roleFilter === 'editor') return 'No editors found.';
    return 'No students found.';
  }, [roleFilter]);
  const permissionGroups = useMemo(() => groupedPermissionCatalog(), []);

  function openEdit(user) {
    setEditTarget(user);
    setEditForm({
      name: String(user?.name || ''),
      email: String(user?.email || ''),
      teacherFee: String(user?.teacher_fee ?? ''),
      permissions: resolvePermissions(user?.role || roleFilter, user?.permissions),
    });
  }

  function closeEdit() {
    setEditTarget(null);
    setEditForm({ name: '', email: '', teacherFee: '', permissions: resolvePermissions(roleFilter, {}) });
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editTarget?._id) return;
    const name = editForm.name.trim();
    const email = editForm.email.trim();
    const teacherFee = String(editForm.teacherFee || '').trim();
    if (!name || !email) {
      toast.error('Name and email are required');
      return;
    }
    if (roleFilter === 'teacher') {
      const fee = Number(teacherFee || 0);
      if (!Number.isFinite(fee) || fee < 0) {
        toast.error('Fee must be a non-negative number');
        return;
      }
    }
    setSavingEdit(true);
    try {
      const { data } = await api.patch(`/users/${editTarget._id}`, {
        name,
        email,
        ...(roleFilter === 'teacher' ? { teacher_fee: Number(teacherFee || 0) } : {}),
        ...(canManageCustomPermissions ? { permissions: editForm.permissions } : {}),
      });
      setUsers((prev) => prev.map((u) => (u._id === editTarget._id ? { ...u, ...data } : u)));
      toast.success(`${roleLabel} updated`);
      closeEdit();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update ${roleLabel.toLowerCase()}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeUser(user) {
    if (!user?._id) return;
    const ok = window.confirm(`Delete ${roleLabel.toLowerCase()} "${user.name}"?`);
    if (!ok) return;
    setDeletingId(user._id);
    try {
      await api.delete(`/users/${user._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
      toast.success(`${roleLabel} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to delete ${roleLabel.toLowerCase()}`);
    } finally {
      setDeletingId('');
    }
  }

  function openCreateModal() {
    setCreateForm(defaultCreateForm(roleFilter));
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creatingUser) return;
    setShowCreateModal(false);
  }

  async function createUser(event) {
    event.preventDefault();
    if (creatingUser) return;
    const firstName = createForm.firstName.trim();
    const secondName = createForm.secondName.trim();
    const username = createForm.username.trim();
    const name = `${firstName} ${secondName}`.trim();
    const email = createForm.email.trim();
    const teacherFee = String(createForm.teacherFee || '').trim();
    const password = createForm.password;
    const confirmPassword = createForm.confirmPassword;
    if (!firstName || !secondName || !username || !email || !password) {
      toast.error('First name, second name, username, email and password are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (roleFilter === 'teacher') {
      const fee = Number(teacherFee || 0);
      if (!Number.isFinite(fee) || fee < 0) {
        toast.error('Fee must be a non-negative number');
        return;
      }
    }
    setCreatingUser(true);
    try {
      const { data } = await api.post('/users', {
        name,
        email,
        password,
        role: roleFilter,
        ...(roleFilter === 'teacher' ? { teacher_fee: Number(teacherFee || 0) } : {}),
        ...(canManageCustomPermissions ? { permissions: createForm.permissions } : {}),
      });
      const created = data?.user;
      if (created?._id) {
        const newRow = {
          _id: created._id,
          name: created.name,
          email: created.email,
          role: created.role,
          teacher_fee: Number(created.teacher_fee || 0),
          permissions: created.permissions || createForm.permissions,
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [newRow, ...prev]);
      }
      toast.success(`${roleLabel} created`);
      setShowCreateModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to create ${roleLabel.toLowerCase()}`);
    } finally {
      setCreatingUser(false);
    }
  }

  function toggleEditPermission(key) {
    setEditForm((prev) => ({
      ...prev,
      permissions: {
        ...(prev.permissions || {}),
        [key]: !prev.permissions?.[key],
      },
    }));
  }

  function toggleCreatePermission(key) {
    setCreateForm((prev) => ({
      ...prev,
      permissions: {
        ...(prev.permissions || {}),
        [key]: !prev.permissions?.[key],
      },
    }));
  }

  return (
    <div className="au-root">
      <div className="au-header">
        <div>
          <h1>{pageTitle}</h1>
          <p className="au-subtle">{users.length} users</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          Add {roleLabel}
        </button>
      </div>

      <div className="card au-table-card">
        {loading ? (
          <p className="au-subtle">Loading...</p>
        ) : users.length === 0 ? (
          <p className="au-subtle">{emptyLabel}</p>
        ) : (
          <div className="table-wrap" style={{ overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  {roleFilter === 'teacher' && <th>Fee</th>}
                  <th>Role</th>
                  <th>Date joined</th>
                  {showManageActions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="au-user-cell">
                        {resolveAvatarUrl(u) ? (
                          <AppImage
                            src={resolveAvatarUrl(u)}
                            alt={u.name || 'User avatar'}
                            className="au-avatar-img"
                            width={88}
                            height={88}
                            quality={80}
                            fallback="/logo-mark.png"
                          />
                        ) : (
                          <span className="au-avatar">{initials(u.name)}</span>
                        )}
                        <span className="au-user-meta">
                          <strong>{u.name}</strong>
                          {(u.phone || u.bio) && (
                            <small>{u.phone || String(u.bio || '').slice(0, 72)}</small>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    {roleFilter === 'teacher' && <td>${Number(u.teacher_fee || 0).toFixed(2)}</td>}
                    <td>
                      <span className="au-role-pill">{roleDisplay(u.role)}</span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    {showManageActions && (
                      <td>
                        <div className="au-actions">
                          <button type="button" className="btn btn-ghost" onClick={() => openEdit(u)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => removeUser(u)}
                            disabled={deletingId === u._id}
                          >
                            {deletingId === u._id ? 'Deleting...' : 'Delete'}
                          </button>
                          {showReportAction && (
                            <Link to={`/dashboard/admin/users/students/${u._id}/report`} className="btn btn-ghost">
                              Report
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editTarget && (
        <div className="au-modal-backdrop" role="presentation" onClick={closeEdit}>
          <div className="card au-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3>Edit {roleLabel.toLowerCase()}</h3>
            <form className="au-modal-form" onSubmit={saveEdit}>
              <label className="label">
                Name
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label className="label">
                Email
                <input
                  className="input"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </label>
              {roleFilter === 'teacher' && (
                <label className="label">
                  Fee
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.teacherFee}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, teacherFee: e.target.value }))}
                    required
                  />
                </label>
              )}
              {canManageCustomPermissions && (
                <div className="au-permission-section">
                  <p className="au-permission-title">Permissions</p>
                  {Object.entries(permissionGroups).map(([groupTitle, items]) => (
                    <div key={`edit-${groupTitle}`} className="au-permission-group">
                      <p className="au-permission-group-title">{groupTitle}</p>
                      <div className="au-permission-grid">
                        {items.map((perm) => (
                          <label key={`edit-${perm.key}`} className="au-permission-item" title={perm.description}>
                            <input
                              type="checkbox"
                              checked={Boolean(editForm.permissions?.[perm.key])}
                              onChange={() => toggleEditPermission(perm.key)}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="au-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="au-modal-backdrop" role="presentation" onClick={closeCreateModal}>
          <div className="card au-modal au-create-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="au-create-head">
              <h3>Add New {roleLabel}</h3>
              <button type="button" className="au-modal-close" onClick={closeCreateModal} aria-label="Close dialog">
                x
              </button>
            </div>
            <form className="au-create-form" onSubmit={createUser}>
              <label className="label">
                First Name
                <input
                  className="input"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                  required
                />
              </label>
              <label className="label">
                Second Name
                <input
                  className="input"
                  value={createForm.secondName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, secondName: e.target.value }))}
                  placeholder="Enter second name"
                  required
                />
              </label>
              <label className="label">
                Phone Number (Optional)
                <input
                  className="input"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                />
              </label>
              <label className="label au-create-span">
                Username
                <input
                  className="input"
                  value={createForm.username}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  required
                />
              </label>
              <label className="label au-create-span">
                Email Address
                <input
                  className="input"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  required
                />
              </label>
              {roleFilter === 'teacher' && (
                <label className="label">
                  Fee
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.teacherFee}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, teacherFee: e.target.value }))}
                    placeholder="Enter instructor fee"
                  />
                </label>
              )}
              <label className="label">
                Password
                <input
                  className="input"
                  type="password"
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  required
                />
              </label>
              <label className="label">
                Retype Password
                <input
                  className="input"
                  type="password"
                  minLength={6}
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Retype password"
                  required
                />
              </label>
              {canManageCustomPermissions && (
                <div className="au-create-span au-permission-section">
                  <p className="au-permission-title">Permissions</p>
                  {Object.entries(permissionGroups).map(([groupTitle, items]) => (
                    <div key={`create-${groupTitle}`} className="au-permission-group">
                      <p className="au-permission-group-title">{groupTitle}</p>
                      <div className="au-permission-grid">
                        {items.map((perm) => (
                          <label key={`create-${perm.key}`} className="au-permission-item" title={perm.description}>
                            <input
                              type="checkbox"
                              checked={Boolean(createForm.permissions?.[perm.key])}
                              onChange={() => toggleCreatePermission(perm.key)}
                            />
                            <span>{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="au-create-actions au-create-span">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal} disabled={creatingUser}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creatingUser}>
                  {creatingUser ? `Adding ${roleLabel}...` : `Add ${roleLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .au-root {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .au-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .au-subtle {
          margin-top: 0.3rem;
          color: var(--muted);
          font-size: 0.9rem;
        }
        .au-table-card {
          padding: 0.7rem;
        }
        .au-user-cell {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
        }
        .au-avatar {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--primary), var(--primary-strong));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.73rem;
          font-weight: 700;
          flex-shrink: 0;
        }
        .au-avatar-img {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid var(--border);
          object-fit: cover;
          flex-shrink: 0;
          background: #fff;
        }
        .au-user-meta {
          display: inline-flex;
          flex-direction: column;
          min-width: 0;
        }
        .au-user-meta strong {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--heading);
          line-height: 1.2;
        }
        .au-user-meta small {
          color: var(--muted);
          font-size: 0.74rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
        .au-role-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 0.22rem 0.58rem;
          background: color-mix(in srgb, var(--primary) 12%, transparent);
          color: var(--primary);
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: capitalize;
          letter-spacing: 0.02em;
        }
        .au-actions {
          display: inline-flex;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .au-actions .btn {
          min-height: 32px;
          padding: 0.34rem 0.62rem;
          font-size: 0.78rem;
        }
        .au-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .au-modal {
          width: min(520px, 100%);
          padding: 1rem;
        }
        .au-modal h3 {
          margin: 0 0 0.8rem;
        }
        .au-modal-form {
          display: grid;
          gap: 0.8rem;
        }
        .au-modal-form .label {
          display: grid;
          gap: 0.35rem;
        }
        .au-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .au-modal-actions .btn,
        .au-create-actions .btn {
          min-height: 34px;
          padding: 0.36rem 0.66rem;
          font-size: 0.8rem;
        }
        .au-permission-section {
          display: grid;
          gap: 0.65rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: color-mix(in srgb, var(--bg-soft) 70%, #fff);
          padding: 0.7rem;
        }
        .au-permission-title {
          margin: 0;
          font-weight: 700;
          color: var(--heading);
          font-size: 0.86rem;
        }
        .au-permission-group {
          display: grid;
          gap: 0.35rem;
        }
        .au-permission-group-title {
          margin: 0;
          font-size: 0.78rem;
          color: var(--muted);
          font-weight: 600;
        }
        .au-permission-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.38rem 0.8rem;
        }
        .au-permission-item {
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          font-size: 0.8rem;
          color: #334155;
        }
        .au-permission-item input {
          accent-color: var(--primary);
        }
        .au-create-modal {
          width: min(760px, 100%);
          max-height: min(86vh, 760px);
          overflow: auto;
          padding: 0;
        }
        .au-create-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 1.1rem 1.2rem;
          border-bottom: 1px solid var(--border);
        }
        .au-create-head h3 {
          margin: 0;
          font-size: 1.15rem;
        }
        .au-modal-close {
          border: none;
          background: transparent;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: #64748b;
        }
        .au-create-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          padding: 1rem 1.2rem 1.2rem;
        }
        .au-create-form .label {
          display: grid;
          gap: 0.35rem;
          font-weight: 600;
        }
        .au-create-span {
          grid-column: 1 / -1;
        }
        .au-create-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.7rem;
          flex-wrap: wrap;
          margin-top: 0.3rem;
        }
        @media (max-width: 760px) {
          .au-create-form {
            grid-template-columns: 1fr;
          }
          .au-permission-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
