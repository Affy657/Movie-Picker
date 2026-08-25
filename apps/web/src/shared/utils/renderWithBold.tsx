import type { ReactNode } from 'react';

export function renderWithBold(text: string): ReactNode {
  const parts = text.split('**');
  return parts.reduce<ReactNode>((acc, part, index) => {
    const piece = index % 2 === 1 ? <strong>{part}</strong> : part;
    if (acc == null || acc === '') return piece;
    return (
      <>
        {acc}
        {piece}
      </>
    );
  }, null);
}
