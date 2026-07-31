/**
 * Parses a 'YYYY-MM-DD' string (or a full ISO timestamp — only the date portion
 * is used) into a local Date built from its Y/M/D components. Avoids the
 * UTC-parsing day-shift bug: `new Date('2026-08-01')` is parsed as UTC midnight,
 * which `.toLocaleDateString()` then renders as the *previous* day in any
 * timezone behind UTC.
 */
export const parseYMD = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

/** Formats a Date into 'YYYY-MM-DD' using local date parts (avoids UTC-shift bugs from toISOString). */
export const formatYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Formats a 'YYYY-MM-DD' string into 'DD/MM/YYYY' for display. */
export const formatDisplayDate = (value?: string): string => {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
};

/**
 * Formats a *calendar-date* field (exam date, license valid-upto, date of
 * birth — a date the user picked, with no meaningful time-of-day) via
 * `parseYMD` so it can't drift a day depending on the viewer's timezone.
 *
 * Do NOT use this for genuine timestamps (createdAt, issuedAt, paidAt) —
 * those represent a real moment and should keep using
 * `new Date(value).toLocaleDateString(...)` directly, since converting an
 * actual instant to the viewer's local calendar day is correct there.
 */
export const formatCalendarDate = (
  value?: string | null,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
  locale = 'en-IN'
): string => {
  const date = parseYMD(value ?? undefined);
  return date ? date.toLocaleDateString(locale, options) : '';
};
