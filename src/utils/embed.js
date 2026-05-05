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
    const h = Number(match[1] || 0);
    const m = Number(match[2] || 0);
    const s = Number(match[3] || 0);
    const total = h * 3600 + m * 60 + s;
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

  if (host === 'player.vimeo.com') {
    const cleanPath = path.replace(/\/+$/, '');
    return appendParams(`https://player.vimeo.com${cleanPath}`, {
      title: '0',
      byline: '0',
      portrait: '0',
      api: '1',
      player_id: 'watch-player',
    });
  }

  if (host === 'vimeo.com') {
    const id = path.split('/').filter(Boolean)[0];
    return id
      ? appendParams(`https://player.vimeo.com/video/${id}`, {
          title: '0',
          byline: '0',
          portrait: '0',
          api: '1',
          player_id: 'watch-player',
        })
      : '';
  }

  return '';
}
