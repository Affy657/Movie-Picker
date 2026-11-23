import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import ConsentBanner from '@/app/components/ConsentBanner';
import { AppTestProviders } from '@/test-utils/queryWrapper';

function renderBanner() {
  return render(
    <AppTestProviders>
      <MemoryRouter>
        <ConsentBanner />
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ConsentBanner', () => {
  afterEach(() => {
    localStorage.removeItem('moviepicker-consent');
  });

  it('puts refusing and accepting side by side, then the detailed choice', () => {
    renderBanner();

    const banner = screen.getByRole('region', { name: 'Vos préférences de confidentialité' });
    const names = within(banner)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(names).toEqual(['Tout refuser', 'Tout accepter', 'Personnaliser']);
  });

  it('records a refusal and goes away', async () => {
    renderBanner();

    await userEvent.click(screen.getByRole('button', { name: 'Tout refuser' }));

    expect(JSON.parse(localStorage.getItem('moviepicker-consent') ?? 'null')).toMatchObject({
      decided: true,
      analytics: false,
    });
    expect(screen.queryByRole('button', { name: 'Tout refuser' })).not.toBeInTheDocument();
  });
});
