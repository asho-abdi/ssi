import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { SafeImage } from '../../components/SafeImage';
import { useAuth } from '../../context/AuthContext';

/**
 * Student account profile: avatar uploads go to ImageKit via POST /uploads/images,
 * then we persist url + fileId with PATCH /auth/profile (same flow as instructors).
 */
export function StudentProfile() {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatarUrl: '',
    avatarFileId: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: me } = await api.get('/auth/me');
        if (cancelled) return;
        setProfile({
          name: me.name || '',
          email: me.email || '',
          phone: me.phone || '',
          bio: me.bio || '',
          avatarUrl: me.avatar_url || '',
          avatarFileId: me.avatar_file_id || '',
        });
      } catch {
        if (!cancelled) toast.error('Could not load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/auth/profile', {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: profile.avatarUrl,
        avatar_file_id: profile.avatarFileId,
      });
      await refreshUser();
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
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
        const next = {
          ...profile,
          avatarUrl: data.url || '',
          avatarFileId: String(data.fileId || '').trim(),
        };
        setProfile(next);
        await api.patch('/auth/profile', { avatar_url: next.avatarUrl, avatar_file_id: next.avatarFileId });
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
      <div style={{ maxWidth: 560 }}>
        <p style={{ color: 'var(--muted, #64748b)' }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ marginTop: 0 }}>Your profile</h1>
      <p style={{ color: 'var(--muted, #64748b)', marginBottom: '1.25rem' }}>Update your photo and contact details.</p>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        {profile.avatarUrl ? (
          <SafeImage src={profile.avatarUrl} alt="" width={240} quality={85} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'var(--border, #e2e8f0)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            {profile.name?.slice(0, 2).toUpperCase() || 'ME'}
          </div>
        )}
        <button type="button" className="btn btn-secondary" onClick={uploadAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
        </button>
      </div>

      <form onSubmit={save} style={{ display: 'grid', gap: '0.75rem' }}>
        <label className="label">
          Name
          <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
        </label>
        <label className="label">
          Email
          <input className="input" type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
        </label>
        <label className="label">
          Phone
          <input className="input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
        </label>
        <label className="label">
          Bio
          <textarea className="input" rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
