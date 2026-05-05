import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { SSILogo } from '../components/SSILogo';
import '../styles/auth.css';

export function CertificateVerify() {
  const { serial: serialParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [serialInput, setSerialInput] = useState(serialParam || searchParams.get('serial') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = '#f7f9fb';
    document.body.style.color = '#1a202c';
    return () => {
      document.body.style.background = prevBg;
      document.body.style.color = prevColor;
    };
  }, []);

  useEffect(() => {
    const seedSerial = serialParam || searchParams.get('serial') || '';
    if (!seedSerial) return;
    verify(seedSerial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialParam, searchParams]);

  async function verify(rawSerial) {
    const normalized = String(rawSerial || '').trim();
    if (!normalized) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const encoded = encodeURIComponent(normalized);
      const { data } = await api.get(`/certificates/verify/${encoded}`);
      setResult(data?.certificate || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Certificate verification failed');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const value = serialInput.trim();
    if (!value) return;
    navigate(`/certificate/verify/${encodeURIComponent(value)}`);
  }

  return (
    <div className="auth-page">
      <div className="auth-page-top">
        <SSILogo className="auth-page-brand" />
      </div>
      <div className="card auth-card">
        <h1>Certificate Verification</h1>
        <p className="auth-muted">Enter a certificate serial number to validate authenticity.</p>
        <form className="auth-form" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="serial">
              Certificate Serial
            </label>
            <input
              id="serial"
              className="input"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder="e.g. CNO.SSI000123"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Verifying…' : 'Verify Certificate'}
          </button>
        </form>

        {error ? <div className="auth-note auth-note-error">{error}</div> : null}

        {result ? (
          <div className="auth-note auth-note-success">
            <p>
              <strong>Valid Certificate</strong>
            </p>
            <p>Serial: {result.serial_label}</p>
            <p>Student: {result.student_name}</p>
            <p>Course: {result.course_title}</p>
            <p>Issued: {new Date(result.issue_date).toLocaleDateString()}</p>
          </div>
        ) : null}

        <p className="auth-footer">
          Back to <Link to="/">Home</Link>
        </p>
      </div>
    </div>
  );
}
