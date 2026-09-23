export function initialsOf(pseudo: string): string {
  const parts = pseudo.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  if (a && b) return (a + b).toUpperCase();
  return pseudo.slice(0, 2).toUpperCase();
}
