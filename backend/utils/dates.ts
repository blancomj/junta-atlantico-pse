export const COLOMBIA_OFFSET_HOURS: number = -5;

/**
 * Retorna la fecha/hora actual en formato ISO 8601 con offset -05:00 (Colombia)
 */
export function nowColombiaISO(): string {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const colombiaMs = utcMs + (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000);
  const colombia = new Date(colombiaMs);

  const pad = (n: number, w: number = 2): string => String(n).padStart(w, '0');
  const yyyy = colombia.getUTCFullYear();
  const mm = pad(colombia.getUTCMonth() + 1);
  const dd = pad(colombia.getUTCDate());
  const hh = pad(colombia.getUTCHours());
  const mi = pad(colombia.getUTCMinutes());
  const ss = pad(colombia.getUTCSeconds());
  const ms = pad(colombia.getUTCMilliseconds(), 3);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}-05:00`;
}
