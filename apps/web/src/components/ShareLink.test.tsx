import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShareLink from './ShareLink';

describe('ShareLink', () => {
  it('affiche l’URL en lecture seule, champ copiable et bouton', () => {
    const url = 'https://example.com/s/abc';
    render(<ShareLink url={url} />);
    const input = screen.getByRole('textbox', { name: /lien de partage/i });
    expect(input).toHaveDisplayValue(url);
    expect(input).toHaveAttribute('readOnly');
    expect(screen.getByRole('button', { name: /copier le lien/i })).toBeInTheDocument();
  });

  it('affiche un label personnalisé', () => {
    render(<ShareLink url="https://x.test/y" label="Lien hôte" />);
    expect(screen.getByText('Lien hôte')).toBeInTheDocument();
  });
});
