import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QrCode from '@/shared/components/QrCode';

describe('QrCode', () => {
  it('renders a titled SVG, of fixed size, encoding the value', () => {
    const { container } = render(
      <QrCode value="https://example.test/e/abc" title="QR code de la soirée" />
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '240');
    expect(svg).toHaveAttribute('height', '240');
    expect(screen.getByTitle('QR code de la soirée').closest('svg')).toBe(svg);
    expect(svg!.querySelectorAll('path, rect').length).toBeGreaterThan(1);
  });

  it('two different values give two different drawings', () => {
    const first = render(<QrCode value="a" title="t" />).container.innerHTML;
    const second = render(<QrCode value="b" title="t" />).container.innerHTML;

    expect(first).not.toBe(second);
  });
});
