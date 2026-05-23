/**
 * Visit ID format: `${YYYY-MM-DD}_${code}` (local VN date).
 * In-day uniqueness; same code on different days = different visit.
 */
export function makeVisitId(date: string, code: string): string {
  return `${date}_${code}`;
}

/** Today's date in YYYY-MM-DD format, in Asia/Ho_Chi_Minh timezone. */
export function todayDateVN(now: Date = new Date()): string {
  return formatDateVN(now);
}

export function formatDateVN(d: Date): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}
