import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, BookOpenCheck, Camera, DollarSign, Globe, Link2, Mail, Shield, UserCircle, Users } from 'lucide-react';
import api from '../../api/client';
import { AppImage } from '../../components/common/AppImage';
import { DashboardPage, SectionCard, SummaryCard, SummaryGrid } from '../../components/dashboard/DashboardUI';
import { useAuth } from '../../context/AuthContext';

export function TeacherProfile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ courses: 0, students: 0, earnings: 0 });
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatarUrl: '',
  });
  const [social, setSocial] = useState({
    facebook: '',
    linkedin: '',
    website: '',
  });
  const [instructorSettings, setInstructorSettings] = useState({
    publicProfile: true,
    notifications: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    nextPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [meRes, coursesRes, earningsRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/teacher/courses').catch(() => ({ data: [] })),
          api.get('/teacher/earnings').catch(() => ({ data: {} })),
        ]);
        if (cancelled) return;
        const me = meRes.data || {};
        const courses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        const earnings = earningsRes.data || {};
        const studentsCountFromBreakdown = Array.isArray(earnings.breakdown)
          ? earnings.breakdown.reduce((sum, row) => sum + Number(row?.sales || 0), 0)
          : 0;

        setProfile((prev) => ({
          ...prev,
          name: me.name || '',
          email: me.email || '',
          phone: me.phone || '',
          bio: me.bio || '',
          avatarUrl: me.avatar_url || '',
        }));
        setSocial({
          facebook: me.social?.facebook || '',
          linkedin: me.social?.linkedin || '',
          website: me.social?.website || '',
        });
        setInstructorSettings({
          publicProfile: Boolean(me.instructor_settings?.public_profile ?? true),
          notifications: Boolean(me.instructor_settings?.notifications ?? true),
        });
        setStats({
          courses: courses.length,
          students: Number(earnings.orders_count || studentsCountFromBreakdown || 0),
          earnings: Number(earnings.total_revenue || 0),
        });
      } catch {
        if (!cancelled) toast.error('Could not load profile dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveProfileInfo(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatarUrl,
        social: {
          facebook: social.facebook,
          linkedin: social.linkedin,
          website: social.website,
        },
        instructor_settings: {
          public_profile: instructorSettings.publicProfile,
          notifications: instructorSettings.notifications,
        },
      });
      await refreshUser();
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function saveSocialAndSettings() {
    setSaving(true);
    try {
      await api.patch('/auth/profile', {
        social: {
          facebook: social.facebook,
          linkedin: social.linkedin,
          website: social.website,
        },
        instructor_settings: {
          public_profile: instructorSettings.publicProfile,
          notifications: instructorSettings.notifications,
        },
      });
      await refreshUser();
      toast.success('Instructor settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save instructor settings');
    } finally {
      setSaving(false);
    }
  }

  function submitPasswordChange(e) {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.nextPassword || !passwordForm.confirmPassword) {
      toast.error('Please complete all password fields');
      return;
    }
    if (passwordForm.nextPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      toast.error('New and confirm password do not match');
      return;
    }
    setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
    toast.success('Password form validated. Password API endpoint is not configured yet.');
  }

  async function uploadAvatar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      setUploadingAvatar(true);
      try {
        const { data } = await api.post('/uploads/images', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const nextProfile = {
          ...profile,
          avatarUrl: data.url || '',
        };
        setProfile(nextProfile);
        await api.patch('/auth/profile', {
          avatar_url: nextProfile.avatarUrl,
        });
        await refreshUser();
        toast.success('Avatar updated');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Avatar upload failed');
      } finally {
        setUploadingAvatar(false);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <DashboardPage title="Instructor Profile" subtitle="Manage your profile, security, and visibility settings.">
        <SectionCard>
          <p style={{ color: 'var(--muted)' }}>Loading profile...</p>
        </SectionCard>
      </DashboardPage>
    );
  }

  return (
    <DashboardPage title="Instructor Profile" subtitle="Manage your public profile, account security, and instructor preferences.">
      <SummaryGrid>
        <SummaryCard label="Courses Created" value={stats.courses} />
        <SummaryCard label="Students Enrolled" value={stats.students} />
        <SummaryCard label="Earnings" value={`$${stats.earnings.toFixed(2)}`} />
      </SummaryGrid>

      <div className="tp-layout">
        <aside className="card tp-profile-card card--static">
          <div className="tp-avatar-wrap">
            {profile.avatarUrl ? (
              <AppImage
                src={profile.avatarUrl}
                alt={profile.name || 'Instructor avatar'}
                className="tp-avatar-img"
                width={220}
                height={220}
                quality={85}
                fallback="/logo-mark.png"
              />
            ) : (
              <div className="tp-avatar-fallback">
                <UserCircle size={44} />
              </div>
            )}
            <button type="button" className="btn btn-secondary tp-avatar-btn" onClick={uploadAvatar} disabled={uploadingAvatar}>
              <Camera size={14} />
              {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
            </button>
          </div>
          <h3>{profile.name || 'Instructor'}</h3>
          <p className="tp-email">
            <Mail size={14} />
            {profile.email}
          </p>
          <span className="tp-role-pill">Instructor</span>
          <p className="tp-bio">{profile.bio?.trim() ? profile.bio : 'Add a short bio to introduce yourself to learners.'}</p>
          <div className="tp-mini-stats">
            <div><BookOpenCheck size={14} />{stats.courses} Courses</div>
            <div><Users size={14} />{stats.students} Students</div>
            <div><DollarSign size={14} />${stats.earnings.toFixed(0)}</div>
          </div>
        </aside>

        <section className="card tp-edit-card card--static">
          <div className="tp-tabs" role="tablist" aria-label="Profile sections">
            <button type="button" className={`tp-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile Info</button>
            <button type="button" className={`tp-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>Password</button>
            <button type="button" className={`tp-tab ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>Social Links</button>
            <button type="button" className={`tp-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Instructor Settings</button>
          </div>

          {activeTab === 'profile' && (
            <form className="tp-form-grid" onSubmit={saveProfileInfo}>
              <label className="label">
                Name
                <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
              </label>
              <label className="label">
                Email
                <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
              </label>
              <label className="label">
                Phone (optional)
                <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 555 000 1234" />
              </label>
              <label className="label tp-span-2">
                Bio
                <textarea className="input" rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Write a short instructor bio..." />
              </label>
              <div className="tp-actions tp-span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setProfile({ ...profile, phone: '', bio: '' })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form className="tp-form-grid" onSubmit={submitPasswordChange}>
              <label className="label tp-span-2">
                Current Password
                <input className="input" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              </label>
              <label className="label">
                New Password
                <input className="input" type="password" value={passwordForm.nextPassword} onChange={(e) => setPasswordForm({ ...passwordForm, nextPassword: e.target.value })} />
              </label>
              <label className="label">
                Confirm Password
                <input className="input" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
              </label>
              <div className="tp-actions tp-span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Shield size={14} />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {activeTab === 'social' && (
            <div className="tp-form-grid">
              <label className="label tp-span-2">
                Facebook
                <input className="input" value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} placeholder="https://facebook.com/your-profile" />
              </label>
              <label className="label tp-span-2">
                LinkedIn
                <input className="input" value={social.linkedin} onChange={(e) => setSocial({ ...social, linkedin: e.target.value })} placeholder="https://linkedin.com/in/your-profile" />
              </label>
              <label className="label tp-span-2">
                Website
                <input className="input" value={social.website} onChange={(e) => setSocial({ ...social, website: e.target.value })} placeholder="https://yourwebsite.com" />
              </label>
              <div className="tp-actions tp-span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setSocial({ facebook: '', linkedin: '', website: '' })}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={saveSocialAndSettings}>
                  <Link2 size={14} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tp-form-grid">
              <div className="tp-setting-row tp-span-2">
                <div>
                  <strong>Public Profile</strong>
                  <p>Allow students to view your instructor profile and bio.</p>
                </div>
                <button
                  type="button"
                  className={`tp-toggle ${instructorSettings.publicProfile ? 'on' : ''}`}
                  onClick={() => setInstructorSettings({ ...instructorSettings, publicProfile: !instructorSettings.publicProfile })}
                  aria-pressed={instructorSettings.publicProfile}
                >
                  <span />
                </button>
              </div>
              <div className="tp-setting-row tp-span-2">
                <div>
                  <strong>Notifications</strong>
                  <p>Receive updates for course activity and learner progress.</p>
                </div>
                <button
                  type="button"
                  className={`tp-toggle ${instructorSettings.notifications ? 'on' : ''}`}
                  onClick={() => setInstructorSettings({ ...instructorSettings, notifications: !instructorSettings.notifications })}
                  aria-pressed={instructorSettings.notifications}
                >
                  <span />
                </button>
              </div>
              <div className="tp-setting-hint tp-span-2">
                <Globe size={14} />
                Settings are saved to your dashboard profile preferences.
              </div>
              <div className="tp-actions tp-span-2">
                <button type="button" className="btn btn-secondary" onClick={() => setInstructorSettings({ publicProfile: true, notifications: true })}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={saveSocialAndSettings}>
                  <Bell size={14} />
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .tp-layout {
          display: grid;
          grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
        }
        .tp-profile-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.55rem;
        }
        .tp-avatar-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .tp-avatar-img,
        .tp-avatar-fallback {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          border: 2px solid color-mix(in srgb, var(--primary) 35%, var(--border));
          background: var(--bg-soft);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          object-fit: cover;
        }
        .tp-avatar-btn {
          min-height: 34px;
          font-size: 0.78rem;
          padding: 0.34rem 0.6rem;
        }
        .tp-profile-card h3 {
          margin: 0.2rem 0 0;
          font-size: 1.02rem;
        }
        .tp-email {
          margin: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.28rem;
          font-size: 0.82rem;
          color: var(--muted);
        }
        .tp-role-pill {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.55rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--primary);
          background: color-mix(in srgb, var(--primary) 12%, #ffffff);
          border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
        }
        .tp-bio {
          margin: 0.25rem 0 0;
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .tp-mini-stats {
          width: 100%;
          margin-top: 0.55rem;
          display: grid;
          gap: 0.42rem;
        }
        .tp-mini-stats div {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 0.35rem 0.5rem;
          font-size: 0.8rem;
          color: #1f2937;
          background: var(--bg-elevated);
        }
        .tp-edit-card {
          padding: 0.9rem;
        }
        .tp-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-bottom: 0.9rem;
        }
        .tp-tab {
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          border-radius: 9px;
          padding: 0.4rem 0.62rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }
        .tp-tab.active {
          color: var(--primary);
          border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
          background: color-mix(in srgb, var(--primary) 10%, #ffffff);
        }
        .tp-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }
        .tp-span-2 {
          grid-column: 1 / -1;
        }
        .tp-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.55rem;
          margin-top: 0.3rem;
        }
        .tp-setting-row {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: var(--bg-elevated);
          padding: 0.55rem 0.68rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.65rem;
        }
        .tp-setting-row strong {
          display: block;
          font-size: 0.85rem;
          color: #0f172a;
        }
        .tp-setting-row p {
          margin: 0.2rem 0 0;
          font-size: 0.77rem;
          color: var(--muted);
        }
        .tp-setting-hint {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          color: var(--muted);
          font-size: 0.78rem;
        }
        .tp-toggle {
          width: 42px;
          height: 24px;
          border: none;
          border-radius: 999px;
          background: #cbd5e1;
          padding: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: background-color 0.2s ease;
        }
        .tp-toggle.on {
          background: #2563eb;
        }
        .tp-toggle span {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: #fff;
          transform: translateX(0);
          transition: transform 0.2s ease;
        }
        .tp-toggle.on span {
          transform: translateX(18px);
        }
        @media (max-width: 980px) {
          .tp-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .tp-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </DashboardPage>
  );
}
