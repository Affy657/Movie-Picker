import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import { ProfileTools } from './ProfileActions';

vi.mock('@/shared/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: vi.fn() }),
}));

const profile = {
  handle: 'adrien',
  displayName: 'Adrien',
  avatarId: null,
  isFollowedByMe: null,
} as unknown as PublicProfile;

describe('ProfileTools', () => {
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    stubMatchMedia(false);
  });

  it('loads the share window on demand and opens it with the profile above the QR code', async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ConsentProvider>
          <MemoryRouter>
            <ProfileTools profile={profile} isOwnProfile />
          </MemoryRouter>
        </ConsentProvider>
      </LocaleProvider>
    );

    expect(screen.queryByRole('dialog', { name: 'Partager ce profil' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Partager' }));

    const dialog = await screen.findByRole('dialog', { name: 'Partager ce profil' });
    expect(within(dialog).getByText('@adrien', { selector: 'span' })).toBeInTheDocument();
  });
});
