export function themeHueFromLabel(theme: string | null | undefined): number | null {
  const t = theme?.trim();
  if (!t) return null;
  let h = 0;
  for (let i = 0; i < t.length; i += 1) {
    h = (h + (t.codePointAt(i) ?? 0) * (i + 1)) % 360;
  }
  return h;
}
