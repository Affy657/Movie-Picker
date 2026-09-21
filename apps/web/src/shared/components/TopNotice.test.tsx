import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopNotice from '@/shared/components/TopNotice';
import { LocaleProvider } from '@/shared/i18n';

function renderNotice(children?: React.ReactNode, onDismiss = vi.fn()) {
  localStorage.setItem('moviepicker-locale', 'fr');
  render(
    <LocaleProvider>
      <TopNotice title="Un titre" description="Une explication." onDismiss={onDismiss}>
        {children}
      </TopNotice>
    </LocaleProvider>
  );
  return onDismiss;
}

describe('TopNotice', () => {
  it('is a live region named after its title, closed by the cross', async () => {
    const onDismiss = renderNotice();

    const region = screen.getByRole('region', { name: 'Un titre' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Une explication.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders its actions only when given some', () => {
    renderNotice(<button type="button">Agir</button>);

    expect(screen.getByRole('button', { name: 'Agir' })).toBeInTheDocument();
  });
});
