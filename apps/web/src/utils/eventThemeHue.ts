/**
 * Teinte HSL déterministe à partir du libellé thème — bandeau / accent sans palette figée.
 */
export function themeHueFromLabel(theme: string | null | undefined): number | null {
  const t = theme?.trim();
  if (!t) return null;
  let h = 0;
  for (let i = 0; i < t.length; i += 1) {
    h = (h + t.charCodeAt(i) * (i + 1)) % 360;
  }
  return h;
}
