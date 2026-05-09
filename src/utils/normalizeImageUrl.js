const DEFAULT_FALLBACK = '/placeholder-course.svg';

function backendOrigin() {
  const raw = String(import.meta.env.VITE_API_URL || '').trim();
  if (!raw) return '';
  const noSlash = raw.replace(/\/+$/, '');
  return noSlash.endsWith('/api') ? noSlash.slice(0, -4).replace(/\/+$/, '') : noSlash;
}

function withImageKitTransform(url, { width, quality = 80 } = {}) {
  try {
    const parsed = new URL(url);
    const endpointBase = String(import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '').trim().replace(/\/+$/, '');
    const isImageKitHost =
      parsed.hostname.includes('ik.imagekit.io') ||
      (endpointBase ? parsed.href.startsWith(endpointBase) : false);
    if (!isImageKitHost) return url;
    if (parsed.searchParams.has('tr')) return url;
    const tr = ['f-auto', `q-${Number.isFinite(Number(quality)) ? Number(quality) : 80}`];
    if (Number.isFinite(Number(width)) && Number(width) > 0) tr.push(`w-${Math.floor(Number(width))}`);
    parsed.searchParams.set('tr', tr.join(','));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Normalize every image URL for dev/prod and always return a safe renderable src.
 * - null/invalid -> fallback placeholder
 * - localhost or legacy /uploads paths -> backend origin from VITE_API_URL
 * - ImageKit URLs -> auto format/quality (+ optional width) transform
 */
export function normalizeImageUrl(input, opts = {}) {
  const fallback = String(opts.fallback || DEFAULT_FALLBACK);
  const raw = String(input || '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
  if (raw.startsWith('/')) {
    // Legacy local upload paths are rewritten to backend origin.
    const origin = backendOrigin();
    const rewritten = origin ? `${origin}${raw}` : raw;
    return withImageKitTransform(rewritten, opts);
  }
  if (!/^https?:\/\//i.test(raw)) return fallback;
  try {
    const parsed = new URL(raw);
    const origin = backendOrigin();
    const isLocalHost =
      parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]';
    const isLegacyUploadPath = parsed.pathname.startsWith('/uploads/');
    const rewritten = origin && (isLocalHost || isLegacyUploadPath) ? `${origin}${parsed.pathname}${parsed.search}${parsed.hash}` : raw;
    return withImageKitTransform(rewritten, opts);
  } catch {
    return fallback;
  }
}

export function resolveMediaUrl(input) {
  return normalizeImageUrl(input, { fallback: '' });
}

