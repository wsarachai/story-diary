/** Default timezone for Thai users when none is stored. */
export const DEFAULT_TIMEZONE = "Asia/Bangkok";

/**
 * Returns YYYY-MM-DD in the given IANA timezone.
 * Safe to call on the server (Node 18+ supports Intl.DateTimeFormat with tz).
 */
export function localDateStr(timezone: string = DEFAULT_TIMEZONE, now = new Date()): string {
  return Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}

/**
 * Returns YYYY-MM in the given IANA timezone.
 */
export function localMonthStr(timezone: string = DEFAULT_TIMEZONE, now = new Date()): string {
  return localDateStr(timezone, now).slice(0, 7);
}

/**
 * Returns the Monday of the current week as YYYY-MM-DD in the given IANA timezone.
 * The habit weekly view renders columns Mon–Sun, so week ranges must start on Monday.
 */
export function localWeekStartStr(timezone: string = DEFAULT_TIMEZONE, now = new Date()): string {
  const [y, m, d] = localDateStr(timezone, now).split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
