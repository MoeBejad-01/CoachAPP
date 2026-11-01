// Small date helpers. Days are handled as local YYYY-MM-DD strings.
// Formatting follows the active UI language (set by LangProvider).

type Locale = 'en' | 'ar';
let locale: Locale = 'en';
export function setDateLocale(l: Locale) {
  locale = l;
}

const NAMES = {
  en: {
    dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    mon: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  ar: {
    dow: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    mon: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  },
};
const N = () => NAMES[locale];

export function weekdayName(i: number): string {
  return N().days[i];
}

/** Arabic counted noun for days: يومين / 3 أيام / 11 يومًا. */
function arDays(n: number): string {
  if (n === 1) return 'يوم';
  if (n === 2) return 'يومين';
  if (n >= 3 && n <= 10) return `${n} أيام`;
  return `${n} يومًا`;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function daysBetween(fromISO: string, toISOStr: string): number {
  const a = parseDay(fromISO).getTime();
  const b = parseDay(toISOStr).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dayOfWeek(iso: string): number {
  return parseDay(iso).getDay();
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const dow = dayOfWeek(iso);
  return addDays(iso, dow === 0 ? -6 : 1 - dow);
}

export function fmtDay(iso: string): string {
  const d = parseDay(iso);
  return `${N().dow[d.getDay()]} ${d.getDate()} ${N().mon[d.getMonth()]}`;
}

export function fmtShort(iso: string): string {
  const d = parseDay(iso);
  return `${d.getDate()} ${N().mon[d.getMonth()]}`;
}

export function fmtLong(iso: string): string {
  const d = parseDay(iso);
  return `${d.getDate()} ${N().mon[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtDow(iso: string): string {
  return N().dow[parseDay(iso).getDay()];
}

export function fmtTime(isoTs: string): string {
  const d = new Date(isoTs);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDaysAgo(n: number): string {
  return locale === 'ar' ? `قبل ${arDays(n)}` : `${n} days ago`;
}

/** "Today", "Yesterday", "3 days ago", or a date for anything older than two weeks. */
export function fmtRelativeDay(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = daysBetween(iso.slice(0, 10), todayISO());
  if (diff <= 0) return locale === 'ar' ? 'اليوم' : 'Today';
  if (diff === 1) return locale === 'ar' ? 'أمس' : 'Yesterday';
  if (diff < 14) return fmtDaysAgo(diff);
  return fmtShort(iso);
}

/** Message-list style stamp: time today, weekday this week, date otherwise. */
export function fmtStamp(isoTs: string): string {
  const local = toISO(new Date(isoTs));
  const diff = daysBetween(local, todayISO());
  if (diff <= 0) return fmtTime(isoTs);
  if (diff === 1) return locale === 'ar' ? 'أمس' : 'Yesterday';
  if (diff < 7) return fmtDow(local);
  return fmtShort(local);
}

export function fmtAgo(isoTs: string): string {
  const mins = Math.round((Date.now() - new Date(isoTs).getTime()) / 60000);
  const ar = locale === 'ar';
  if (mins < 1) return ar ? 'الآن' : 'just now';
  if (mins < 60) return ar ? `قبل ${mins} دقيقة` : `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return ar ? `قبل ${hrs} ساعة` : `${hrs} h ago`;
  const rel = fmtRelativeDay(toISO(new Date(isoTs)));
  return ar ? rel : rel.toLowerCase();
}

export function ageFrom(birthISO: string): number {
  const b = parseDay(birthISO);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

/** Timestamp `daysAgo` days back at hh:mm local time. */
export function stampAt(daysAgo: number, hh: number, mm: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}
