import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QrCode from '@/shared/components/QrCode';
import { qrSvgDataUrl } from '@/shared/components/qrCodeShapes';

const EVENT_URL = 'https://movie-picker.fr/e/qoU5jcDVXC';

describe('QrCode', () => {
  it('renders an image named by its title, at a fixed size, drawn from the shared markup', () => {
    render(<QrCode value={EVENT_URL} title="QR code de la soirée" />);

    const image = screen.getByRole('img', { name: 'QR code de la soirée' });
    expect(image).toHaveAttribute('width', '240');
    expect(image).toHaveAttribute('height', '240');
    expect(image).toHaveAttribute('src', qrSvgDataUrl(EVENT_URL, 240));
  });

  it('two different values give two different drawings', () => {
    render(<QrCode value="https://movie-picker.fr/e/a" title="a" />);
    render(<QrCode value="https://movie-picker.fr/e/b" title="b" />);

    expect(screen.getByRole('img', { name: 'a' }).getAttribute('src')).not.toBe(
      screen.getByRole('img', { name: 'b' }).getAttribute('src')
    );
  });

  it('draws the plain code when asked, for a code shown too small for the clap', () => {
    render(<QrCode value={EVENT_URL} title="t" plain />);

    expect(screen.getByRole('img', { name: 't' })).toHaveAttribute(
      'src',
      qrSvgDataUrl(EVENT_URL, 240, { plain: true })
    );
  });
});
