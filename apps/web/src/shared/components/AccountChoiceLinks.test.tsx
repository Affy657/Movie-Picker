import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';
import buttonStyles from '@/shared/components/Button.module.css';
import { LocaleProvider } from '@/shared/i18n';

function renderLinks(props: Partial<Parameters<typeof AccountChoiceLinks>[0]> = {}) {
  return render(
    <LocaleProvider>
      <MemoryRouter>
        <div data-testid="actions">
          <AccountChoiceLinks returnTo="/e/soiree?rejoindre=1" {...props} />
        </div>
      </MemoryRouter>
    </LocaleProvider>
  );
}

describe('AccountChoiceLinks', () => {
  it('puts account creation first as the filled button, and keeps the way back for both', () => {
    renderLinks();

    const links = screen.getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Créer un compte',
      'J’ai déjà un compte',
    ]);
    expect(links[0]).toHaveClass(buttonStyles.primary!);
    expect(links[1]).not.toHaveClass(buttonStyles.primary!);
    expect(links[0]).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent('/e/soiree?rejoindre=1')}`
    );
    expect(links[1]).toHaveAttribute(
      'href',
      `/login?returnTo=${encodeURIComponent('/e/soiree?rejoindre=1')}`
    );
  });

  it('stretches both buttons when asked to fill the width', () => {
    renderLinks({ fullWidth: true });

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveClass(buttonStyles.fullWidth!);
    }
  });

  it('says which way the visitor chose', async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    renderLinks({ onChoose });

    await user.click(screen.getByRole('link', { name: 'Créer un compte' }));
    await user.click(screen.getByRole('link', { name: 'J’ai déjà un compte' }));

    expect(onChoose.mock.calls).toEqual([['register'], ['login']]);
  });
});
