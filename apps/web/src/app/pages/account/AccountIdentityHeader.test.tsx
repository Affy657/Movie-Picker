import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { UserProfile } from '@/features/auth/types';
import AccountIdentityHeader from './AccountIdentityHeader';

vi.mock('@/features/auth/contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

const user = {
  userId: 'u1',
  displayName: 'Léa Moreau',
  handle: 'lea',
  avatarId: 'alpha',
} as UserProfile;

function renderHeader(patchProfile: ReturnType<typeof vi.fn>) {
  mockUseAuth.mockReturnValue({ patchProfile } as never);
  render(
    <MemoryRouter>
      <LocaleProvider>
        <AccountIdentityHeader user={user} />
      </LocaleProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountIdentityHeader', () => {
  it('saves the avatar picked in the dialog', async () => {
    const patchProfile = vi.fn().mockResolvedValue(user);
    renderHeader(patchProfile);

    await userEvent.click(screen.getByRole('button', { name: 'Avatar' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Choisir l’avatar beta' }));

    expect(patchProfile).toHaveBeenCalledExactlyOnceWith({ avatarId: 'beta' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an alert when the avatar cannot be saved', async () => {
    const patchProfile = vi.fn().mockRejectedValue(new Error('offline'));
    renderHeader(patchProfile);

    await userEvent.click(screen.getByRole('button', { name: 'Avatar' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Choisir l’avatar beta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'L’avatar n’a pas pu être enregistré. Réessayez.'
    );
  });
});
