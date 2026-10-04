import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notice from '@/shared/components/Notice';
import styles from '@/shared/components/Notice.module.css';
import { LocaleProvider } from '@/shared/i18n';

function renderNotice(props: Partial<React.ComponentProps<typeof Notice>> = {}) {
  localStorage.setItem('moviepicker-locale', 'fr');
  render(
    <LocaleProvider>
      <Notice title="Un titre" description="Une explication." {...props} />
    </LocaleProvider>
  );
}

describe('Notice', () => {
  it('is a live region named after its title, closed by the cross', async () => {
    const onClose = vi.fn();
    renderNotice({ onClose });

    const region = screen.getByRole('region', { name: 'Un titre' });
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region.className).toContain(styles.top);
    expect(screen.getByText('Une explication.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders its actions only when given some', () => {
    renderNotice({ children: <button type="button">Agir</button> });

    expect(screen.getByRole('button', { name: 'Agir' })).toBeInTheDocument();
  });

  it('sits at the bottom and offers no cross when a decision is required', () => {
    renderNotice({ placement: 'bottom', children: <button type="button">Accepter</button> });

    expect(screen.getByRole('region', { name: 'Un titre' }).className).toContain(styles.bottom);
    expect(screen.queryByRole('button', { name: 'Fermer' })).toBeNull();
  });
});
