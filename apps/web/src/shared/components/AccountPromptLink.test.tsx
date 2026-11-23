import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import AccountPromptLink from './AccountPromptLink';
import buttonStyles from './Button.module.css';

function renderLink() {
  render(
    <LocaleProvider>
      <MemoryRouter>
        <AccountPromptLink
          returnTo="/u/lea"
          title="Suivre Léa"
          message="Créez un compte pour suivre Léa."
          className="follow"
          ariaLabel="Suivre @lea"
        >
          Suivre
        </AccountPromptLink>
      </MemoryRouter>
    </LocaleProvider>
  );
  return screen.getByRole('link', { name: 'Suivre @lea' });
}

describe('AccountPromptLink', () => {
  it('leads to account creation without script, and says it opens a dialog', () => {
    stubMatchMedia(false);

    const link = renderLink();

    expect(link).toHaveAttribute('href', '/register?returnTo=%2Fu%2Flea');
    expect(link).toHaveAttribute('aria-haspopup', 'dialog');
    expect(link).toHaveClass('follow');
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('explains why an account is needed, then offers to create one before signing in', async () => {
    stubMatchMedia(false);
    const link = renderLink();

    await userEvent.click(link);

    const dialog = screen.getByRole('dialog', { name: 'Suivre Léa' });
    expect(within(dialog).getByText('Créez un compte pour suivre Léa.')).toBeInTheDocument();
    const [register, login] = within(dialog).getAllByRole('link');
    expect(register).toHaveAccessibleName('Créer un compte');
    expect(register).toHaveClass(buttonStyles.primary!);
    expect(register).toHaveAttribute('href', '/register?returnTo=%2Fu%2Flea');
    expect(login).toHaveAccessibleName('J’ai déjà un compte');
    expect(login).toHaveAttribute('href', '/login?returnTo=%2Fu%2Flea');
  });

  it('opens as a sheet on a phone, with the same choice', async () => {
    stubMatchMedia(true);
    const link = renderLink();

    await userEvent.click(link);

    const dialog = screen.getByRole('dialog', { name: 'Suivre Léa' });
    expect(within(dialog).getByRole('link', { name: 'Créer un compte' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'J’ai déjà un compte' })).toBeInTheDocument();
  });

  it('lets a modified click open the page in a new tab instead', () => {
    stubMatchMedia(false);
    const link = renderLink();

    const allowed = fireEvent.click(link, { ctrlKey: true });

    expect(allowed).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes from its close button', async () => {
    stubMatchMedia(false);
    const link = renderLink();
    await userEvent.click(link);

    await userEvent.click(
      within(screen.getByRole('dialog', { name: 'Suivre Léa' })).getByRole('button', {
        name: 'Fermer',
      })
    );

    expect(screen.queryByRole('dialog', { name: 'Suivre Léa' })).toBeNull();
  });
});
