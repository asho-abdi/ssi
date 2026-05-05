import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const initialForm = {
  name: '',
  email: '',
  password: '',
  role: 'student',
};

export function AdminCreateUser() {
  const [form, setForm] = useState(initialForm);
  const [creating, setCreating] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      await api.post('/users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success('User created');
      setForm(initialForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="acu-root">
      <div className="acu-head">
        <h1>Create User</h1>
        <p className="acu-subtle">Create student, teacher, or editor accounts.</p>
      </div>

      <form className="card acu-card" onSubmit={onSubmit}>
        <div className="acu-grid">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="acu-action">
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .acu-root {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .acu-head h1 {
          margin: 0;
        }
        .acu-subtle {
          margin-top: 0.35rem;
          color: var(--muted);
        }
        .acu-card {
          padding: 1rem;
          border-radius: 14px;
          box-shadow: var(--shadow-sm);
        }
        .acu-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(160px, 1fr)) auto;
          gap: 0.65rem;
          align-items: end;
        }
        .acu-action {
          display: flex;
        }
        .acu-action .btn {
          min-height: 40px;
          white-space: nowrap;
        }
        @media (max-width: 1100px) {
          .acu-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 700px) {
          .acu-grid {
            grid-template-columns: 1fr;
          }
          .acu-action .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
