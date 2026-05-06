/**
 * Backend HTTP origin for static files (/uploads/...) — not the /api prefix.
 * Uses VITE_API_URL from env (trimmed, no trailing slash).
 */
function backendOrigin() {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim();
  if (!raw) return '';
  let base = raw.replace(/\/+$/, '');
  if (base.endsWith('/api')) {
    base = base.slice(0, -4).replace(/\/+$/, '');
  }
  return base;
}

/**
 * Turn stored thumbnail/upload URLs into a browser-loadable URL on Vercel.
 * - Absolute http(s) (Unsplash, etc.) → unchanged
 * - http://localhost... → same path on backendOrigin in production
 * - /uploads/... → prefixed with backendOrigin when env is set
 */
export function resolveMediaUrl(url) {
  if (url == null || url === '') return '';
  const s = String(url).trim();
  if (!s) return '';

  if (s.startsWith('data:') || s.startsWith('blob:')) return s;

  if (s.startsWith('http://') || s.startsWith('https://')) {
    let u;
    try {
      u = new URL(s);
    } catch {
      return s;
    }
    const origin = backendOrigin();
    const isLocal =
      u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]';
    if (origin && isLocal) {
      return `${origin}${u.pathname}${u.search}${u.hash}`;
    }
    return s;
  }

  if (s.startsWith('/')) {
    const origin = backendOrigin();
    if (origin) {
      return `${origin}${s}`;
    }
  }

  return s;
}
