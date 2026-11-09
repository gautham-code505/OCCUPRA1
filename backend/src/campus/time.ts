// Campus-local time helpers. All campus logic uses a fixed campus timezone offset
// so behaviour is identical on a laptop and on a UTC cloud server.

export const CAMPUS_TZ_OFFSET_MIN = Number(process.env.CAMPUS_TZ_OFFSET_MINUTES ?? 330); // IST default

export interface CampusParts {
  dow: number; // 0 = Sunday
  minuteOfDay: number; // 0..1439
  dateKey: string; // YYYY-MM-DD (campus local)
  isWeekend: boolean;
}

export function campusParts(date: Date | number): CampusParts {
  const ms = typeof date === 'number' ? date : date.getTime();
  const local = new Date(ms + CAMPUS_TZ_OFFSET_MIN * 60000);
  const dow = local.getUTCDay();
  return {
    dow,
    minuteOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
    dateKey: local.toISOString().slice(0, 10),
    isWeekend: dow === 0 || dow === 6,
  };
}

/** Build a real timestamp for a campus-local weekday + minute in the same week as `ref`. */
export function campusTimestamp(ref: Date | number, dow: number, minuteOfDay: number): number {
  const refMs = typeof ref === 'number' ? ref : ref.getTime();
  const p = campusParts(refMs);
  const localMidnight = refMs + CAMPUS_TZ_OFFSET_MIN * 60000 - (refMs + CAMPUS_TZ_OFFSET_MIN * 60000) % 86400000;
  const dayShift = dow - p.dow;
  return localMidnight + dayShift * 86400000 + minuteOfDay * 60000 - CAMPUS_TZ_OFFSET_MIN * 60000;
}

/** "02:00 PM" | "14:00" | "2 pm" -> minutes after midnight */
export function parseClock(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function hhmm(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function ampm(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
