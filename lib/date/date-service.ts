/**
 * DateService — Handles timezone-consistent date logic for Asia/Kolkata.
 * Storing timestamptz in UTC, computing the local day in Asia/Kolkata.
 */

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/**
 * Returns current date string formatted as YYYY-MM-DD in the target timezone.
 */
export function getLocalTodayDateString(timezone: string = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Parses and formats an arbitrary Date or ISO string into YYYY-MM-DD in the target timezone.
 */
export function toLocalDateString(dateInput: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date input provided to toLocalDateString");
  }
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Converts a date/time to local Asia/Kolkata display time string (e.g., "1:00 PM").
 */
export function toLocalTimeString(dateInput: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date input provided to toLocalTimeString");
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return formatter.format(d);
}
