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

