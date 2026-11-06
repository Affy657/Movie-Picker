import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignOutPendingNotice from '@/app/components/SignOutPendingNotice';
import { LocaleProvider } from '@/shared/i18n';

const useAuth = vi.fn();
vi.mock('@/features/auth/contexts/AuthContext', () => ({
  useAuth: () => useAuth(),
}));

function renderNotice() {
  return render(
    <LocaleProvider>
      <SignOutPendingNotice />
    </LocaleProvider>
  );
}

describe('SignOutPendingNotice', () => {
  beforeEach(() => {
    useAuth.mockReset();
  });

  it('tells that the sign-out is not confirmed, and that it will be retried', () => {
    useAuth.mockReturnValue({ signOutPending: true });

    renderNotice();

    expect(screen.getByText('Déconnexion non confirmée')).toBeInTheDocument();
    expect(screen.getByText(/relancée au retour du réseau/)).toBeInTheDocument();
  });

  it('stays out of the way otherwise', () => {
    useAuth.mockReturnValue({ signOutPending: false });

    const { container } = renderNotice();

    expect(container).toBeEmptyDOMElement();
  });
});
