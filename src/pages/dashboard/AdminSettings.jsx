import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { SettingsMonetizationSection } from './SettingsMonetizationSection';

const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'user_role', label: 'User & Roles' },
  { key: 'course', label: 'Course' },
  { key: 'payment', label: 'Payment' },
  { key: 'video', label: 'Video' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'certificate', label: 'Certificate' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'security', label: 'Security' },
  { key: 'appearance', label: 'Appearance' },
  { key: 'monetization', label: 'Monetization' },
];

function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function setByPath(obj, path, value) {
  const parts = path.split('.');
  const root = { ...(obj || {}) };
  let current = root;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    current[p] = { ...(current[p] || {}) };
    current = current[p];
  }
  current[parts[parts.length - 1]] = value;
  return root;
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" className={`as-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} role="switch" aria-checked={checked}>
      <span />
    </button>
  );
}

export function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('general');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [sectionUi, setSectionUi] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/settings')
      .then((res) => {
        if (!cancelled) setSettings(res.data || {});
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sectionData = useMemo(() => settings?.[active] || {}, [settings, active]);
  const activeSection = useMemo(() => SECTIONS.find((section) => section.key === active) || SECTIONS[0], [active]);
  const activeSectionUi = sectionUi[active] || { isOpen: true, done: false };

  function updateField(path, value) {
    setSettings((prev) => {
      const next = { ...(prev || {}) };
      next[active] = setByPath(next[active] || {}, path, value);
      return next;
    });
  }

  function toPercent(value, fallback = 0) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(100, num));
  }

  async function uploadImage(urlPath, fileIdPath) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      setUploadingField(urlPath);
      try {
        const { data } = await api.post('/uploads/images', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateField(urlPath, data.url || '');
        updateField(fileIdPath, data.fileId || '');
        toast.success('Image uploaded');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Upload failed');
      } finally {
        setUploadingField('');
      }
    };
    input.click();
  }

  async function saveActiveSection() {
    if (!settings) return;
    setSaving(true);
    try {
      const payload = settings[active] || {};
      const { data } = await api.patch(`/settings/${active}`, payload);
      setSettings(data.settings || settings);
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function toggleSectionOpen(key) {
    setSectionUi((prev) => ({
      ...prev,
      [key]: {
        isOpen: !(prev[key]?.isOpen ?? true),
        done: prev[key]?.done ?? false,
      },
    }));
  }

  function markSectionDone(key) {
    setSectionUi((prev) => ({
      ...prev,
      [key]: {
        isOpen: false,
        done: true,
      },
    }));
  }

  if (loading || !settings) {
    return <p style={{ color: 'var(--muted)' }}>Loading settings...</p>;
  }

  return (
    <div className="as-root">
      <aside className="card as-sidebar">
        <h2>Settings</h2>
        <nav className="as-nav">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`as-nav-item ${active === section.key ? 'active' : ''}`}
              onClick={() => setActive(section.key)}
            >
              <span>{section.label}</span>
              {(sectionUi[section.key]?.done ?? false) && (
                <span className="as-done-badge">
                  <Check size={12} />
                  Done
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <section className="card as-content">
        <div className="as-section-head">
          <div className="as-section-head-copy">
            <h3>{activeSection?.label} Settings</h3>
            {activeSectionUi.done && <span className="as-section-subtle">Marked as done</span>}
          </div>
          <div className="as-section-head-actions">
            {active !== 'monetization' && (
              <button type="button" className="btn btn-secondary as-compact-btn" onClick={() => markSectionDone(active)}>
                <Check size={14} />
                {activeSectionUi.done ? 'Done' : 'Mark Done'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost as-collapse-btn"
              aria-expanded={activeSectionUi.isOpen}
              onClick={() => toggleSectionOpen(active)}
            >
              <ChevronDown className={activeSectionUi.isOpen ? 'is-open' : ''} size={15} />
            </button>
          </div>
        </div>
        <div className={`as-content-wrap ${activeSectionUi.isOpen ? 'is-open' : ''}`}>
          <div className="as-content-inner">
        {active === 'general' && (
          <>
            <div className="as-grid">
              <label className="label as-field">
                Platform name
                <input className="input" value={getByPath(sectionData, 'platform_name') || ''} onChange={(e) => updateField('platform_name', e.target.value)} />
              </label>
              <label className="label as-field">
                Language
                <select className="input" value={getByPath(sectionData, 'language') || 'en'} onChange={(e) => updateField('language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="fr">French</option>
                </select>
              </label>
              <label className="label as-field">
                Timezone
                <select className="input" value={getByPath(sectionData, 'timezone') || 'UTC'} onChange={(e) => updateField('timezone', e.target.value)}>
                  <option value="UTC">UTC</option>
                  <option value="Africa/Nairobi">Africa/Nairobi</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </label>
              <label className="label as-field">
                Currency
                <select className="input" value={getByPath(sectionData, 'currency') || 'USD'} onChange={(e) => updateField('currency', e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                </select>
              </label>
              <div className="as-field as-upload-row">
                <div>
                  <label className="label">Logo upload</label>
                  <div className="as-upload-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => uploadImage('logo_url', 'logo_file_id')}>
                      {uploadingField === 'logo_url' ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    {getByPath(sectionData, 'logo_url') && <img src={getByPath(sectionData, 'logo_url')} alt="Logo preview" className="as-preview" />}
                  </div>
                </div>
              </div>
              <div className="as-field as-upload-row">
                <div>
                  <label className="label">Favicon upload</label>
                  <div className="as-upload-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => uploadImage('favicon_url', 'favicon_file_id')}>
                      {uploadingField === 'favicon_url' ? 'Uploading...' : 'Upload Favicon'}
                    </button>
                    {getByPath(sectionData, 'favicon_url') && <img src={getByPath(sectionData, 'favicon_url')} alt="Favicon preview" className="as-preview" />}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {active === 'user_role' && (
          <>
            <div className="as-list">
              <div className="as-row">
                <span>Enable registration</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'enable_registration'))} onChange={(v) => updateField('enable_registration', v)} />
              </div>
              <label className="label as-field">
                Instructor approval
                <select
                  className="input"
                  value={getByPath(sectionData, 'instructor_approval') || 'manual'}
                  onChange={(e) => updateField('instructor_approval', e.target.value)}
                >
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                </select>
              </label>
              {['roles.admin', 'roles.teacher', 'roles.student', 'roles.editor'].map((path) => (
                <div className="as-row" key={path}>
                  <span>{path.split('.')[1].toUpperCase()} role enabled</span>
                  <Toggle checked={Boolean(getByPath(sectionData, path))} onChange={(v) => updateField(path, v)} />
                </div>
              ))}
              {['permissions.manage_users', 'permissions.manage_courses', 'permissions.manage_payments', 'permissions.manage_reports'].map((path) => (
                <div className="as-row" key={path}>
                  <span>{path.split('.')[1].replace('_', ' ')}</span>
                  <Toggle checked={Boolean(getByPath(sectionData, path))} onChange={(v) => updateField(path, v)} />
                </div>
              ))}
            </div>
          </>
        )}

        {active === 'course' && (
          <>
            <div className="as-list">
              <label className="label as-field">
                Course approval
                <select className="input" value={getByPath(sectionData, 'course_approval') || 'manual'} onChange={(e) => updateField('course_approval', e.target.value)}>
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                </select>
              </label>
              <div className="as-row">
                <span>Enable course preview</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'enable_preview'))} onChange={(v) => updateField('enable_preview', v)} />
              </div>
              <div className="as-row">
                <span>Progress tracking system</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'progress_tracking'))} onChange={(v) => updateField('progress_tracking', v)} />
              </div>
              <div className="as-row">
                <span>Enable certificates</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'enable_certificates'))} onChange={(v) => updateField('enable_certificates', v)} />
              </div>
            </div>
          </>
        )}

        {active === 'payment' && (
          <>
            <div className="as-list">
              {['methods.stripe', 'methods.paypal', 'methods.manual', 'methods.evc_plus', 'methods.zaad', 'methods.sahal'].map((path) => (
                <div className="as-row" key={path}>
                  <span>{path.split('.')[1].replace('_', ' ').toUpperCase()} enabled</span>
                  <Toggle checked={Boolean(getByPath(sectionData, path))} onChange={(v) => updateField(path, v)} />
                </div>
              ))}
              <p style={{ margin: 0, color: 'var(--muted)' }}>Currency is controlled in General settings.</p>
              <div className="as-revenue-wrap">
                <p className="as-revenue-title">Revenue Sharing</p>
                <div className="as-revenue-card">
                  <div className="as-revenue-row">
                    <div className="as-revenue-copy">
                      <strong>Enable Revenue Sharing</strong>
                      <p>Allow revenue generated from selling courses to be shared with course creators.</p>
                    </div>
                    <Toggle
                      checked={Boolean(getByPath(sectionData, 'revenue_sharing_enabled') ?? true)}
                      onChange={(v) => updateField('revenue_sharing_enabled', v)}
                    />
                  </div>
                  <div className="as-revenue-divider" />
                  <div className="as-revenue-row as-revenue-row-sharing">
                    <div className="as-revenue-copy">
                      <strong>Sharing Percentage</strong>
                      <p>Set how the sales revenue will be shared among admins and instructors.</p>
                    </div>
                    <div className="as-revenue-inputs">
                      <label className="as-revenue-input-row">
                        <span>Instructor Takes</span>
                        <input
                          className="input as-revenue-input"
                          type="number"
                          min="0"
                          max="100"
                          value={toPercent(getByPath(sectionData, 'instructor_commission_percent') ?? 70, 70)}
                          onChange={(e) => updateField('instructor_commission_percent', toPercent(e.target.value, 0))}
                        />
                      </label>
                      <label className="as-revenue-input-row">
                        <span>Admin Takes</span>
                        <input
                          className="input as-revenue-input"
                          type="number"
                          min="0"
                          max="100"
                          value={100 - toPercent(getByPath(sectionData, 'instructor_commission_percent') ?? 70, 70)}
                          onChange={(e) => updateField('instructor_commission_percent', 100 - toPercent(e.target.value, 0))}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <small style={{ color: 'var(--muted)', fontWeight: 500 }}>Applied to each new paid sale; old transactions keep their original split.</small>
              </div>
            </div>
          </>
        )}

        {active === 'monetization' && <SettingsMonetizationSection />}

        {active === 'video' && (
          <>
            <div className="as-list">
              <label className="label as-field">
                Video provider
                <select className="input" value={getByPath(sectionData, 'provider') || 'youtube'} onChange={(e) => updateField('provider', e.target.value)}>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="upload">Upload</option>
                </select>
              </label>
              <div className="as-row">
                <span>Autoplay</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'autoplay'))} onChange={(v) => updateField('autoplay', v)} />
              </div>
              <div className="as-row">
                <span>Enable controls</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'enable_controls'))} onChange={(v) => updateField('enable_controls', v)} />
              </div>
              <div className="as-row">
                <span>Prevent download</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'protection.prevent_download'))} onChange={(v) => updateField('protection.prevent_download', v)} />
              </div>
              <div className="as-row">
                <span>Disable embed</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'protection.disable_embed'))} onChange={(v) => updateField('protection.disable_embed', v)} />
              </div>
            </div>
          </>
        )}

        {active === 'quiz' && (
          <>
            <div className="as-list">
              <label className="label as-field">
                Passing grade %
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={getByPath(sectionData, 'passing_grade_percent') ?? 70}
                  onChange={(e) => updateField('passing_grade_percent', Number(e.target.value))}
                />
              </label>
              <label className="label as-field">
                Default time limit (minutes)
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={getByPath(sectionData, 'default_time_limit_minutes') ?? 30}
                  onChange={(e) => updateField('default_time_limit_minutes', Number(e.target.value))}
                />
              </label>
              <div className="as-row">
                <span>Show correct answers</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'show_correct_answers'))} onChange={(v) => updateField('show_correct_answers', v)} />
              </div>
              <div className="as-row">
                <span>Allow quiz retake</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'allow_retake'))} onChange={(v) => updateField('allow_retake', v)} />
              </div>
            </div>
          </>
        )}

        {active === 'certificate' && (
          <>
            <div className="as-list">
              <div className="as-row">
                <span>Enable certificate generation</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'enable_generation'))} onChange={(v) => updateField('enable_generation', v)} />
              </div>
              <label className="label as-field">
                Certificate template
                <input className="input" value={getByPath(sectionData, 'template_name') || ''} onChange={(e) => updateField('template_name', e.target.value)} />
              </label>
              {['placeholders.student_name', 'placeholders.course_name', 'placeholders.awarded_date'].map((path) => (
                <div className="as-row" key={path}>
                  <span>{path.split('.')[1].replace('_', ' ')}</span>
                  <Toggle checked={Boolean(getByPath(sectionData, path))} onChange={(v) => updateField(path, v)} />
                </div>
              ))}
            </div>
          </>
        )}

        {active === 'notifications' && (
          <>
            <div className="as-list">
              {['email_notifications', 'course_completion_alerts', 'new_user_alerts', 'instructor_notifications'].map((key) => (
                <div className="as-row" key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <Toggle checked={Boolean(getByPath(sectionData, key))} onChange={(v) => updateField(key, v)} />
                </div>
              ))}
            </div>
          </>
        )}

        {active === 'security' && (
          <>
            <div className="as-list">
              <div className="as-row">
                <span>Prevent video download</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'prevent_video_download'))} onChange={(v) => updateField('prevent_video_download', v)} />
              </div>
              <div className="as-row">
                <span>Disable right click</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'disable_right_click'))} onChange={(v) => updateField('disable_right_click', v)} />
              </div>
              <label className="label as-field">
                Session timeout (minutes)
                <input
                  className="input"
                  type="number"
                  min="5"
                  value={getByPath(sectionData, 'session_timeout_minutes') ?? 60}
                  onChange={(e) => updateField('session_timeout_minutes', Number(e.target.value))}
                />
              </label>
              <div className="as-row">
                <span>Force strong passwords</span>
                <Toggle checked={Boolean(getByPath(sectionData, 'force_strong_passwords'))} onChange={(v) => updateField('force_strong_passwords', v)} />
              </div>
              <label className="label as-field">
                Max login attempts
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={getByPath(sectionData, 'max_login_attempts') ?? 5}
                  onChange={(e) => updateField('max_login_attempts', Number(e.target.value))}
                />
              </label>
            </div>
          </>
        )}

        {active === 'appearance' && (
          <>
            <div className="as-list">
              <label className="label as-field">
                Theme color
                <div className="as-color-row">
                  <input className="input as-color-input" type="color" value={getByPath(sectionData, 'theme_color') || '#2563eb'} onChange={(e) => updateField('theme_color', e.target.value)} />
                  <input className="input" value={getByPath(sectionData, 'theme_color') || '#2563eb'} onChange={(e) => updateField('theme_color', e.target.value)} />
                </div>
              </label>
              <label className="label as-field">
                Font family
                <select className="input" value={getByPath(sectionData, 'font_family') || 'Inter'} onChange={(e) => updateField('font_family', e.target.value)}>
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </label>
              <label className="label as-field">
                Layout
                <select className="input" value={getByPath(sectionData, 'layout') || 'default'} onChange={(e) => updateField('layout', e.target.value)}>
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
            </div>
          </>
        )}

        {active !== 'monetization' && (
          <div className="as-actions">
            <button type="button" className="btn btn-primary" onClick={saveActiveSection} disabled={saving}>
              {saving ? 'Saving...' : 'Save Section'}
            </button>
          </div>
        )}
          </div>
        </div>
      </section>

      <style>{`
        .as-root {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
        }
        .as-sidebar {
          padding: 0.9rem;
          position: sticky;
          top: 88px;
        }
        .as-sidebar h2 {
          margin: 0 0 0.7rem;
          font-size: 1.1rem;
        }
        .as-nav {
          display: grid;
          gap: 0.35rem;
        }
        .as-nav-item {
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          border-radius: 10px;
          text-align: left;
          padding: 0.5rem 0.62rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          font-size: 0.83rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.45rem;
        }
        .as-nav-item.active {
          background: color-mix(in srgb, var(--primary) 12%, #fff);
          border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
          color: #0f172a;
        }
        .as-content {
          padding: 0.8rem;
        }
        .as-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
          margin-bottom: 0.6rem;
        }
        .as-section-head-copy {
          display: inline-flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .as-section-head-copy h3 {
          margin: 0;
          font-size: 0.98rem;
        }
        .as-section-subtle {
          color: var(--muted);
          font-size: 0.76rem;
        }
        .as-section-head-actions {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .as-content-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.26s ease;
        }
        .as-content-wrap.is-open {
          grid-template-rows: 1fr;
        }
        .as-content-inner {
          min-height: 0;
          overflow: hidden;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .as-content-wrap.is-open .as-content-inner {
          opacity: 1;
          transform: translateY(0);
        }
        .as-compact-btn {
          min-height: 32px;
          padding: 0.34rem 0.62rem;
          font-size: 0.78rem;
        }
        .as-collapse-btn {
          min-height: 32px;
          min-width: 32px;
          padding: 0;
          justify-content: center;
        }
        .as-collapse-btn svg {
          transition: transform 0.2s ease;
        }
        .as-collapse-btn svg.is-open {
          transform: rotate(180deg);
        }
        .as-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.8rem;
        }
        .as-list {
          display: grid;
          gap: 0.72rem;
        }
        .as-field {
          display: grid;
          gap: 0.34rem;
        }
        .as-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-elevated);
          padding: 0.5rem 0.62rem;
          gap: 0.7rem;
          font-size: 0.84rem;
        }
        .as-done-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.12rem 0.4rem;
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #15803d;
          background: rgba(22, 163, 74, 0.14);
          border: 1px solid rgba(22, 163, 74, 0.24);
        }
        .as-toggle {
          width: 46px;
          height: 26px;
          border: none;
          border-radius: 999px;
          background: #cbd5e1;
          padding: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: background-color 0.2s ease;
        }
        .as-toggle.on {
          background: #2563eb;
        }
        .as-toggle span {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #fff;
          transform: translateX(0);
          transition: transform 0.2s ease;
        }
        .as-toggle.on span {
          transform: translateX(20px);
        }
        .as-upload-actions {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          flex-wrap: wrap;
        }
        .as-preview {
          width: 42px;
          height: 42px;
          border-radius: 8px;
          border: 1px solid var(--border);
          object-fit: cover;
          background: #fff;
        }
        .as-color-row {
          display: grid;
          grid-template-columns: 64px 1fr;
          gap: 0.55rem;
        }
        .as-color-input {
          padding: 0.1rem;
          min-height: 42px;
        }
        .as-actions {
          margin-top: 1rem;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        .as-revenue-wrap {
          display: grid;
          gap: 0.45rem;
        }
        .as-revenue-title {
          margin: 0;
          color: #4b5563;
          font-size: 0.92rem;
          font-weight: 700;
        }
        .as-revenue-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          padding: 0.9rem;
          display: grid;
          gap: 0.75rem;
        }
        .as-revenue-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
        }
        .as-revenue-row-sharing {
          align-items: flex-start;
        }
        .as-revenue-copy strong {
          display: block;
          font-size: 1.02rem;
          color: #1f2937;
        }
        .as-revenue-copy p {
          margin: 0.32rem 0 0;
          color: #6b7280;
          font-size: 0.9rem;
        }
        .as-revenue-divider {
          height: 1px;
          background: #e5e7eb;
        }
        .as-revenue-inputs {
          display: grid;
          gap: 0.45rem;
          min-width: 240px;
        }
        .as-revenue-input-row {
          display: grid;
          grid-template-columns: auto 80px;
          align-items: center;
          justify-content: end;
          gap: 0.55rem;
        }
        .as-revenue-input-row span {
          color: #374151;
          font-size: 0.92rem;
        }
        .as-revenue-input {
          min-height: 36px;
          text-align: center;
          padding-left: 0.45rem;
          padding-right: 0.45rem;
        }
        @media (max-width: 980px) {
          .as-root {
            grid-template-columns: 1fr;
          }
          .as-sidebar {
            position: static;
          }
          .as-revenue-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .as-revenue-inputs {
            width: 100%;
          }
          .as-revenue-input-row {
            grid-template-columns: 1fr 96px;
          }
        }
        @media (max-width: 700px) {
          .as-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
