import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import '../../styles/student-dashboard.css';

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function resolveCertCourseId(cert) {
  const raw = cert?.course_id;
  if (raw != null && typeof raw === 'object') {
    const id = raw._id ?? raw.id;
    return id != null ? String(id) : '';
  }
  return raw != null ? String(raw) : '';
}

export function StudentCertificates() {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    api
      .get('/certificates')
      .then((res) => setCerts(res.data))
      .catch(() => toast.error('Could not load certificates'));
  }, []);

  async function download(courseId) {
    const id = String(courseId || '').trim();
    if (!OBJECT_ID_RE.test(id)) {
      toast.error('This certificate is missing a valid course link. Contact support.');
      return;
    }
    try {
      const res = await api.get(`/certificates/course/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Downloaded');
    } catch {
      toast.error('Could not download');
    }
  }

  return (
    <div className="sd-cert-page">
      <header className="sd-hero sd-cert-hero">
        <h1 className="sd-hero-title">Certificates</h1>
        <p className="sd-hero-sub">Download PDFs and verify credentials you’ve earned.</p>
      </header>

      <ul className="sd-cert-list">
        {certs.map((c) => (
          <li key={c._id} className="sd-cert-item">
            <div>
              <strong>{c.course_id?.title || 'Course'}</strong>
              <div className="sd-cert-meta">Issued {new Date(c.issue_date).toLocaleDateString()}</div>
              {c.serial_number ? (
                <div className="sd-cert-meta" style={{ marginTop: '0.2rem' }}>
                  Serial CNO.SSI{String(c.serial_number).padStart(6, '0')}
                </div>
              ) : null}
            </div>
            <div className="sd-cert-actions">
              {c.serial_number ? (
                <Link
                  to={`/certificate/verify/CNO.SSI${String(c.serial_number).padStart(6, '0')}`}
                  className="btn btn-secondary"
                >
                  Verify
                </Link>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                disabled={!OBJECT_ID_RE.test(resolveCertCourseId(c))}
                onClick={() => download(resolveCertCourseId(c))}
              >
                Download PDF
              </button>
            </div>
          </li>
        ))}
      </ul>
      {certs.length === 0 && <p className="sd-hero-sub">No certificates yet.</p>}
    </div>
  );
}
