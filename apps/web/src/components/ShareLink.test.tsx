import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('avec showQr, propose un QR repliable pointant vers l’URL', async () => {
    const user = userEvent.setup();
    const url = 'https://example.com/s/abc';
    const { container } = render(<ShareLink url={url} showQr />);
    const details = container.querySelector('details.share-qr-details');
    expect(details).toBeTruthy();
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('QR code invitation')).toBeInTheDocument();
    await user.click(screen.getByText('QR code invitation'));
    expect(details).toHaveAttribute('open');
    expect(container.querySelector('svg')).toBeTruthy();
    expect(screen.getByTitle(/qr code — lien vers la soirée/i)).toBeInTheDocument();
  });
});
