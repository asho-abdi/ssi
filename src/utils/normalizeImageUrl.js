const DEFAULT_FALLBACK = '/placeholder-course.svg';

function backendOrigin() {
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  const noSlash = raw.replace(/\/+$/, '');
  return noSlash.endsWith('/api') ? noSlash.slice(0, -4).replace(/\/+$/, '') : noSlash;
}

/**
 * Normalize every image URL for dev/prod and always return a safe renderable src.
 * - null/invalid -> fallback placeholder
 * - localhost or legacy /uploads paths -> backend origin from VITE_API_URL
 */
export function normalizeImageUrl(input, opts = {}) {
  const fallback = String(opts.fallback || DEFAULT_FALLBACK);
  const raw = String(input || '').trim().replace(/\\/g, '/');
  if (!raw) return fallback;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (raw.startsWith('uploads/')) {
    const origin = backendOrigin();
    const rel = `/${raw}`;
    return origin ? `${origin}${rel}` : rel;
  }
  if (raw.startsWith('/uploads/')) {
    const origin = backendOrigin();
    return origin ? `${origin}${raw}` : raw;
  }
  if (raw.startsWith('/')) {
    // Frontend public assets (/logo-mark.png, /hero-1.svg, etc.) must stay on frontend origin.
    return raw;
  }
  if (!/^https?:\/\//i.test(raw)) return fallback;
  try {
    const parsed = new URL(raw);
    const origin = backendOrigin();
    const isLocalHost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    const isLegacyUploadPath = parsed.pathname.startsWith('/uploads/');
    return origin && (isLocalHost || isLegacyUploadPath) ? `${origin}${parsed.pathname}${parsed.search}${parsed.hash}` : raw;
  } catch {
    return fallback;
  }
}

export function resolveMediaUrl(input) {
  return normalizeImageUrl(input, { fallback: '' });
}

