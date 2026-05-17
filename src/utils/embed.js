/** Normalize YouTube/Vimeo URLs to embeddable src */
export function toEmbedSrc(url) {
  if (!url) return '';
  const raw = url.trim();
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return '';
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return '';

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname || '';
  const appendParams = (base, params) => {
    const q = new URLSearchParams(params);
    return `${base}${base.includes('?') ? '&' : '?'}${q.toString()}`;
  };
  const extractStartSeconds = () => {
    const direct = parsed.searchParams.get('start') || parsed.searchParams.get('t');
    if (!direct) return null;
    const value = String(direct).trim().toLowerCase();
    if (/^\d+$/.test(value)) return Number(value);
    const match = value.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
    if (!match) return null;
    const hrs = Number(match[1] || 0);
    const mins = Number(match[2] || 0);
    const secs = Number(match[3] || 0);
    const total = hrs * 3600 + mins * 60 + secs;
    return total > 0 ? total : null;
  };
  const ytParams = {
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
  };
  if (typeof window !== 'undefined' && window.location?.origin) {
    ytParams.origin = window.location.origin;
  }

  if (host === 'youtu.be') {
    const id = path.split('/').filter(Boolean)[0];
    if (!id) return '';
    const start = extractStartSeconds();
    if (start) ytParams.start = String(start);
    return appendParams(`https://www.youtube.com/embed/${id}`, ytParams);
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (path.startsWith('/embed/')) {
      const id = path.split('/').filter(Boolean)[1];
      if (!id) return '';
      const start = extractStartSeconds();
      if (start) ytParams.start = String(start);
      return appendParams(`https://www.youtube.com/embed/${id}`, ytParams);
    }
    if (path === '/watch') {
      const id = parsed.searchParams.get('v');
      if (!id) return '';
      const start = extractStartSeconds();
      if (start) ytParams.start = String(start);
      return appendParams(`https://www.youtube.com/embed/${id}`, ytParams);
    }
    if (path.startsWith('/shorts/') || path.startsWith('/live/')) {
      const id = path.split('/').filter(Boolean)[1];
      if (!id) return '';
      const start = extractStartSeconds();
      if (start) ytParams.start = String(start);
      return appendParams(`https://www.youtube.com/embed/${id}`, ytParams);
    }
    return '';
  }

  const vimeoPrivacyParams = (sourceUrl) => {
    const params = {
      title: '0',
      byline: '0',
      portrait: '0',
      api: '1',
      player_id: 'watch-player',
    };
    try {
      const u = new URL(sourceUrl);
      const h = u.searchParams.get('h');
      if (h) params.h = h;
    } catch {
      /* ignore */
    }
    return params;
  };

  if (host === 'player.vimeo.com') {
    const cleanPath = path.replace(/\/+$/, '') || '/';
    const base = `https://player.vimeo.com${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
    return appendParams(base, vimeoPrivacyParams(normalized));
  }

  if (host === 'vimeo.com') {
    if (/\/(manage|settings|hub)\b/i.test(path)) return '';
    const parts = path.split('/').filter(Boolean);
    /** Last long numeric segment — handles /video/ID, /channels/…/ID, etc. */
    const videoId = [...parts].reverse().find((p) => /^\d{5,15}$/.test(p));
    if (!videoId) return '';
    return appendParams(`https://player.vimeo.com/video/${videoId}`, vimeoPrivacyParams(normalized));
  }

  return '';
}

/** Public Vimeo page URL (with privacy hash when present) for “Open on Vimeo” links */
export function getVimeoPageUrl(url) {
  if (!url) return '';
  const raw = url.trim();
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return '';
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const path = parsed.pathname || '';
  const h = parsed.searchParams.get('h');

  if (host === 'player.vimeo.com') {
    const m = path.match(/\/video\/(\d{5,15})/);
    if (!m) return '';
    const id = m[1];
    return h ? `https://vimeo.com/${id}?h=${encodeURIComponent(h)}` : `https://vimeo.com/${id}`;
  }

  if (host === 'vimeo.com') {
    if (/\/(manage|settings|hub)\b/i.test(path)) return '';
    const parts = path.split('/').filter(Boolean);
    const videoId = [...parts].reverse().find((p) => /^\d{5,15}$/.test(p));
    if (!videoId) return '';
    return h ? `https://vimeo.com/${videoId}?h=${encodeURIComponent(h)}` : `https://vimeo.com/${videoId}`;
  }

  return '';
}

export function isVimeoEmbedUrl(embedSrc) {
  return Boolean(embedSrc && String(embedSrc).includes('player.vimeo.com'));
}
