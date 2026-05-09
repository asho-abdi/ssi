import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { AppImage } from '../../components/common/AppImage';

export function AdminCertificates() {
  const [certs, setCerts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [template, setTemplate] = useState({
    org_name: '',
    certificate_title: '',
    subtitle: '',
    completion_text: '',
    signature_name: '',
    footer_text: '',
    accent_color: '#1d3557',
    background_color: '#f8fafc',
    border_color: '#f28c28',
    design_image: '',
  });

  useEffect(() => {
    Promise.all([api.get('/certificates/all'), api.get('/certificates/template')])
      .then(([certRes, tplRes]) => {
        setCerts(certRes.data);
        setTemplate((prev) => ({ ...prev, ...tplRes.data }));
      })
      .catch(() => toast.error('Could not load certificates'));
  }, []);

  async function saveTemplate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put('/certificates/template', template);
      setTemplate((prev) => ({ ...prev, ...data }));
      toast.success('Certificate design saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save certificate design');
    } finally {
      setSaving(false);
    }
  }

  async function handleDesignImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be 4MB or smaller');
      return;
    }
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      });
      setTemplate((prev) => ({ ...prev, design_image: dataUrl }));
      toast.success('Design image added');
    } catch {
      toast.error('Could not read image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  return (
    <div>
      <h1>Certificates</h1>

      <form className="card" style={{ marginTop: '1rem' }} onSubmit={saveTemplate}>
        <h3 style={{ marginTop: 0 }}>Certificate design</h3>
        <div className="form-grid">
          <div>
            <label className="label">Organization name</label>
            <input className="input" value={template.org_name || ''} onChange={(e) => setTemplate({ ...template, org_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Certificate title</label>
            <input className="input" value={template.certificate_title || ''} onChange={(e) => setTemplate({ ...template, certificate_title: e.target.value })} />
          </div>
          <div>
            <label className="label">Subtitle</label>
            <input className="input" value={template.subtitle || ''} onChange={(e) => setTemplate({ ...template, subtitle: e.target.value })} />
          </div>
          <div>
            <label className="label">Completion line</label>
            <input className="input" value={template.completion_text || ''} onChange={(e) => setTemplate({ ...template, completion_text: e.target.value })} />
          </div>
          <div>
            <label className="label">Signature name</label>
            <input className="input" value={template.signature_name || ''} onChange={(e) => setTemplate({ ...template, signature_name: e.target.value })} />
          </div>
          <div>
            <label className="label">Footer text</label>
            <input className="input" value={template.footer_text || ''} onChange={(e) => setTemplate({ ...template, footer_text: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Custom design image</label>
            <input className="input" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleDesignImageUpload} disabled={uploadingImage || saving} />
            <small style={{ color: 'var(--muted)' }}>Max 4MB</small>
            {template.design_image && (
              <div style={{ marginTop: '0.6rem' }}>
                <AppImage
                  src={template.design_image}
                  alt="Certificate design preview"
                  width={900}
                  quality={85}
                  fallback="/placeholder-course.svg"
                  style={{
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                  }}
                />
                <div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => setTemplate((prev) => ({ ...prev, design_image: '' }))}
                  >
                    Remove custom image
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label">Accent color</label>
            <input className="input" value={template.accent_color || ''} onChange={(e) => setTemplate({ ...template, accent_color: e.target.value })} placeholder="#1d3557" />
          </div>
          <div>
            <label className="label">Background color</label>
            <input className="input" value={template.background_color || ''} onChange={(e) => setTemplate({ ...template, background_color: e.target.value })} placeholder="#f8fafc" />
          </div>
          <div>
            <label className="label">Border color</label>
            <input className="input" value={template.border_color || ''} onChange={(e) => setTemplate({ ...template, border_color: e.target.value })} placeholder="#f28c28" />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '0.8rem' }}>
          {saving ? 'Saving...' : 'Save design'}
        </button>
      </form>

      <div className="table-wrap card" style={{ marginTop: '1rem', padding: 0, overflow: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Issued date</th>
              <th>Certificate ID</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c._id}>
                <td>{c.user_id?.name || c.user_id?.email || '—'}</td>
                <td>{c.course_id?.title || '—'}</td>
                <td>{new Date(c.issue_date || c.createdAt).toLocaleDateString()}</td>
                <td>{c._id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
        }
        @media (max-width: 800px) {
          .form-grid {
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
