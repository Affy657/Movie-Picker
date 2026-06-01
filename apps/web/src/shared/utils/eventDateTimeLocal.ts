export function eventDateTimeToLocal(date: string, time: string): string {
  if (!date || !time) return '';
  return `${date}T${time}`;
}

export function splitDateTimeLocal(local: string): { date: string; time: string } | null {
  const s = local.trim();
  if (!s) return null;
  const tIndex = s.indexOf('T');
  if (tIndex === -1) return null;
  return { date: s.slice(0, tIndex), time: s.slice(tIndex + 1, tIndex + 6) };
}

export function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToEndDatePayload(local: string): string {
  const s = local.trim();
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}
