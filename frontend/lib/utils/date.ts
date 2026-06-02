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
