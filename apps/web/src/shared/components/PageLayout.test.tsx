import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageLayout from '@/shared/components/PageLayout';

describe('PageLayout', () => {
  it('rend le landmark principal, cible du lien d’évitement', () => {
    render(<PageLayout>Contenu</PageLayout>);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(main).toHaveClass('page');
    expect(main).toHaveTextContent('Contenu');
  });

  it('transmet classe, style et ref', () => {
    const ref = createRef<HTMLElement>();
    render(
      <PageLayout ref={ref} className="extra" style={{ minHeight: '10px' }}>
        x
      </PageLayout>
    );

    expect(ref.current).toBe(screen.getByRole('main'));
    expect(ref.current).toHaveClass('page', 'extra');
    expect(ref.current).toHaveStyle({ minHeight: '10px' });
  });
});
