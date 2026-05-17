/**
 * Format seconds as clock: under 1 hour → M:SS (minutes:seconds, e.g. 8:45);
 * 1 hour+ → H:MM:SS.
 */
export function formatDurationClock(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return null;
  const s = Math.floor(totalSeconds % 60);
  const totalM = Math.floor(totalSeconds / 60);
  const h = Math.floor(totalM / 60);
  const m = totalM % 60;
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${ss}`;
  return `${totalM}:${ss}`;
}

/**
 * Normalize admin-entered lesson duration for display as minutes:seconds (e.g. 8:45),
 * or hours:minutes:seconds when parsed from H:MM:SS / "Xh Ym".
 */
export function formatManualLessonDuration(input) {
  if (input == null || input === '') return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const compact = raw.replace(/\s*:\s*/g, ':');

  // H:MM:SS
  const triple = compact.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (triple) {
    const h = Number(triple[1]);
    const m = Number(triple[2]);
    const sec = Number(triple[3]);
    if (![h, m, sec].every(Number.isFinite) || m >= 60 || sec >= 60 || h < 0) return null;
    const total = h * 3600 + m * 60 + sec;
    return formatDurationClock(total);
  }

  // M:SS — minutes : seconds (seconds may be 1–2 digits on input)
  const pair = compact.match(/^(\d+):(\d{1,2})$/);
  if (pair) {
    const minutes = Number(pair[1]);
    const seconds = Number(pair[2]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || seconds >= 60 || minutes < 0) return null;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  // "1h 20m" / "1h20m" / "2 h 5 min"
  if (/\d\s*h/i.test(raw)) {
    const hm = raw.match(/^(\d+)\s*h(?:\s*(\d+)\s*(?:m|min|minutes?))?$/i);
    if (hm) {
      const h = Number(hm[1]);
      const mPart = hm[2] != null ? Number(hm[2]) : 0;
      if (!Number.isFinite(h) || !Number.isFinite(mPart) || h < 0 || mPart >= 60) return null;
      const total = h * 3600 + mPart * 60;
      return formatDurationClock(total);
    }
  }

  // "12.5 min" or "12 min"
  const minMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:min|minutes?)\b/i);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (!Number.isFinite(mins) || mins < 0) return null;
    const totalSec = Math.round(mins * 60);
    return formatDurationClock(totalSec);
  }

  // "90 sec"
  const secMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(?:sec|secs|second)s?\b/i);
  if (secMatch) {
    const sec = Number(secMatch[1]);
    if (!Number.isFinite(sec) || sec < 0) return null;
    return formatDurationClock(Math.round(sec));
  }

  return null;
}

/**
 * Prefer resolved video length (seconds) when available; otherwise manual lesson.duration.
 */
export function lessonDurationLabel(lesson, durationByUrl = {}) {
  const u = String(lesson?.video_url || '').trim();
  if (u) {
    const sec = durationByUrl[u];
    if (sec != null && Number.isFinite(Number(sec))) {
      return formatDurationClock(Number(sec));
    }
  }
  return formatManualLessonDuration(lesson?.duration);
}
