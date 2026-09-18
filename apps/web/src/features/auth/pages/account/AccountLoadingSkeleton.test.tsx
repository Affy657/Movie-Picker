import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider } from '@/shared/i18n';
import AccountLoadingSkeleton from '@/features/auth/pages/account/AccountLoadingSkeleton';
import { fr } from '@/shared/i18n/locales/fr';

describe('AccountLoadingSkeleton', () => {
  it('announces the loading once and hides its placeholder bars from assistive technology', () => {
    localStorage.setItem('moviepicker-locale', 'fr');
    const { container } = render(
      <LocaleProvider>
        <AccountLoadingSkeleton />
      </LocaleProvider>
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent(fr.auth.account.loadingPlaceholder);
    expect(container.querySelectorAll('[aria-hidden="true"] span').length).toBe(9);
  });
});
