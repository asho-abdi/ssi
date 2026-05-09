import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const emptyCategoryForm = {
  name: '',
  slug: '',
  parent_id: '',
  description: '',
  thumbnail: '',
};

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyCategoryForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const [categoryFormOpen, setCategoryFormOpen] = useState(true);

  async function load() {
    const [catRes, courseRes] = await Promise.all([api.get('/categories'), api.get('/courses')]);
    setCategories(catRes.data);
    setCourses(courseRes.data);
  }

  useEffect(() => {
    load().catch(() => toast.error('Could not load categories'));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
        toast.success('Category updated');
      } else {
        await api.post('/categories', form);
        toast.success('Category created');
      }
      setForm(emptyCategoryForm);
      setEditingId(null);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  }

  function startEdit(c) {
    setShowForm(true);
    setCategoryFormOpen(true);
    setEditingId(c._id);
    setForm({
      name: c.name || '',
      slug: c.slug || '',
      parent_id: c.parent_id?._id || c.parent_id || '',
      description: c.description || '',
      thumbnail: c.thumbnail || '',
    });
  }

  async function runBulkAction() {
    if (bulkAction !== 'delete' || selectedIds.length === 0 || bulkRunning) return;
    if (!confirm(`Delete ${selectedIds.length} selected categories?`)) return;
    setBulkRunning(true);
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/categories/${id}`)));
      toast.success('Selected categories deleted');
      setSelectedIds([]);
      setBulkAction('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk action failed');
    } finally {
      setBulkRunning(false);
    }
  }

  const countByCategory = useMemo(() => {
    const map = {};
    for (const course of courses) {
      const id = course.category_id?._id || course.category_id;
      if (!id) continue;
      map[id] = (map[id] || 0) + 1;
    }
    return map;
  }, [courses]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      [c.name, c.slug, c.description].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [categories, search]);

  const allVisibleSelected =
    filteredCategories.length > 0 && filteredCategories.every((c) => selectedIds.includes(c._id));
  const canApplyBulk = bulkAction === 'delete' && selectedIds.length > 0 && !bulkRunning;

  function toggleAllVisible(checked) {
    if (checked) {
      const ids = new Set([...selectedIds, ...filteredCategories.map((c) => c._id)]);
      setSelectedIds([...ids]);
    } else {
      const visible = new Set(filteredCategories.map((c) => c._id));
      setSelectedIds(selectedIds.filter((id) => !visible.has(id)));
    }
  }

  return (
    <div>
      <div className="cat-head">
        <div>
          <h1>Categories</h1>
          <p style={{ color: 'var(--muted)' }}>
            Group courses by topic (for example: Health Profession, IT, Business).
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowForm((prev) => {
              const next = !prev;
              if (next && !editingId) setForm(emptyCategoryForm);
              if (next) setCategoryFormOpen(true);
              if (!next) setEditingId(null);
              return next;
            });
          }}
        >
          {showForm ? 'Close form' : 'Add category'}
        </button>
      </div>

      <div className="cat-layout" style={{ marginTop: '1rem' }}>
        {showForm && (
        <form className="card cat-left" onSubmit={onSubmit}>
          <div className="cat-form-head">
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Category' : 'Add New Category'}</h3>
            <div className="cat-form-head-actions">
              <button type="button" className="btn btn-secondary cat-compact-btn" onClick={() => setShowForm(false)}>
                <Check size={14} />
                Done
              </button>
              <button
                type="button"
                className="btn btn-ghost cat-collapse-btn"
                aria-expanded={categoryFormOpen}
                onClick={() => setCategoryFormOpen((v) => !v)}
              >
                <ChevronDown className={categoryFormOpen ? 'is-open' : ''} size={15} />
              </button>
            </div>
          </div>
          <div className={`cat-form-wrap ${categoryFormOpen ? 'is-open' : ''}`}>
          <div className="cat-form-inner">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <p className="cat-help">The name is how it appears on your site.</p>
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            <p className="cat-help">Usually lowercase with hyphens.</p>
          </div>
          <div>
            <label className="label">Parent</label>
            <select className="input" value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}>
              <option value="">None</option>
              {categories
                .filter((c) => c._id !== editingId)
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Thumbnail URL</label>
            <input className="input" value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} />
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" type="submit">
              {editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyCategoryForm);
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
            )}
          </div>
          </div>
          </div>
        </form>
        )}

        <div className="cat-right">
          <div className="cat-toolbar">
            <div className="cat-bulk-wrap">
              <div className="cat-bulk-controls">
                <label className="cat-bulk-label" htmlFor="bulk-action-select">
                  Bulk actions
                </label>
                <select
                  id="bulk-action-select"
                  className="input"
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  style={{ minWidth: 180 }}
                >
                  <option value="">Select action</option>
                  <option value="delete">Move to trash</option>
                </select>
                <button
                  type="button"
                  className="btn btn-primary cat-apply-btn"
                  onClick={runBulkAction}
                  disabled={!canApplyBulk}
                >
                  {bulkRunning ? 'Applying...' : 'Apply'}
                </button>
              </div>
              <div className="cat-bulk-meta">
                <span>
                  {selectedIds.length} selected
                </span>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    className="cat-clear-link"
                    onClick={() => setSelectedIds([])}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <input
              className="input"
              placeholder="Search Categories"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </div>

          <div className="table-wrap card" style={{ marginTop: '0.75rem', padding: 0, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                  </th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Slug</th>
                  <th>Count</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c._id)}
                        onChange={(e) =>
                          setSelectedIds(
                            e.target.checked ? [...selectedIds, c._id] : selectedIds.filter((id) => id !== c._id)
                          )
                        }
                      />
                    </td>
                    <td>
                      <img
                        className="cat-thumb"
                        src={c.thumbnail || '/placeholder-course.svg'}
                        alt={c.name}
                      />
                    </td>
                    <td>
                      <strong>{c.name}</strong>
                      {c.parent_id?.name && (
                        <div className="cat-subline">Parent: {c.parent_id.name}</div>
                      )}
                    </td>
                    <td>{c.description || '—'}</td>
                    <td>{c.slug}</td>
                    <td>{countByCategory[c._id] || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => startEdit(c)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => remove(c._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCategories.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ color: 'var(--muted)' }}>
                      No categories found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .cat-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.85rem;
          flex-wrap: wrap;
        }
        .cat-layout {
          display: grid;
          grid-template-columns: ${showForm ? '340px minmax(0, 1fr)' : 'minmax(0, 1fr)'};
          gap: 1rem;
          align-items: start;
        }
        .cat-help {
          margin: 0.45rem 0 0;
          font-size: 0.82rem;
          color: var(--muted);
        }
        .cat-form-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          margin-bottom: 0.35rem;
        }
        .cat-form-head-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .cat-compact-btn {
          min-height: 32px;
          padding: 0.34rem 0.62rem;
          font-size: 0.78rem;
        }
        .cat-collapse-btn {
          min-height: 32px;
          min-width: 32px;
          padding: 0;
          justify-content: center;
        }
        .cat-collapse-btn svg {
          transition: transform 0.2s ease;
        }
        .cat-collapse-btn svg.is-open {
          transform: rotate(180deg);
        }
        .cat-form-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.24s ease;
        }
        .cat-form-wrap.is-open {
          grid-template-rows: 1fr;
        }
        .cat-form-inner {
          min-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .cat-form-wrap.is-open .cat-form-inner {
          opacity: 1;
          transform: translateY(0);
        }
        .cat-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.7rem;
          flex-wrap: wrap;
        }
        .cat-bulk-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .cat-bulk-controls {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .cat-bulk-label {
          font-size: 0.82rem;
          color: var(--muted);
          font-weight: 600;
        }
        .cat-apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .cat-apply-btn {
          min-height: 34px;
          padding: 0.38rem 0.7rem;
          font-size: 0.8rem;
        }
        .cat-bulk-meta {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          color: var(--muted);
          font-size: 0.82rem;
        }
        .cat-clear-link {
          border: none;
          background: transparent;
          color: #2563eb;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 600;
          padding: 0;
        }
        .cat-thumb {
          width: 44px;
          height: 44px;
          object-fit: cover;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: #fff;
        }
        .cat-subline {
          font-size: 0.78rem;
          color: var(--muted);
          margin-top: 0.2rem;
        }
        @media (max-width: 1100px) {
          .cat-layout {
            grid-template-columns: 1fr;
          }
        }
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
        }
        .data-table th {
          color: var(--muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
