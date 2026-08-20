import type { ReactNode } from 'react';

/**
 * Rend un texte contenant des marqueurs `**gras**` (ex. clés i18n) en JSX,
 * les segments entre `**` devenant des `<strong>`.
 */
export function renderWithBold(text: string): ReactNode {
  const parts = text.split('**');
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}
