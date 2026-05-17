/**
 * Format seconds as clock for lesson rows: M:SS under 1 hour, H:MM:SS at 1+ hours.
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

/** Use admin-entered text when it already looks like a timecode. */
export function formatManualLessonDuration(input) {
  if (input == null || input === '') return null;
  const s = String(input).trim();
  if (/^\d{1,3}:\d{2}$/.test(s)) return s;
  if (/^\d{1,2}:\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d+)\s*(?:min|minutes?)\b/i);
  if (m) return `${Number(m[1])}:00`;
  return null;
}
