export function parseEventLocalStartMs(date: string, time: string): number | null {
  const parts = date.split('-').map((p) => Number.parseInt(p, 10));
  const timeParts = (time ?? '00:00').split(':').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const y = parts[0]!;
  const mo = parts[1]!;
  const d = parts[2]!;
  const h = Number.isNaN(timeParts[0]!) ? 0 : timeParts[0]!;
  const mi = Number.isNaN(timeParts[1]!) ? 0 : timeParts[1]!;
  const ms = new Date(y, mo - 1, d, h, mi).getTime();
  return Number.isNaN(ms) ? null : ms;
}
