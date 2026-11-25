import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/shared/i18n';
import { ConsentProvider } from '@/shared/contexts/ConsentContext';
import { stubMatchMedia } from '@/test-utils/matchMedia';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
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
            <ProfileTools profile={profile} isOwnProfile isLoggedIn />
          </MemoryRouter>
        </ConsentProvider>
      </LocaleProvider>
    );

    expect(screen.queryByRole('dialog', { name: 'Partager ce profil' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Partager' }));

    const dialog = await screen.findByRole('dialog', { name: 'Partager ce profil' });
    expect(within(dialog).getByText('@adrien', { selector: 'span' })).toBeInTheDocument();
  });

  const withPhoto = { ...profile, avatarId: `photo:${'a'.repeat(32)}` } as PublicProfile;

  function renderTools(isOwnProfile: boolean, isLoggedIn: boolean) {
    return render(
      <LocaleProvider>
        <QueryClientWrapper>
          <MemoryRouter>
            <ProfileTools profile={withPhoto} isOwnProfile={isOwnProfile} isLoggedIn={isLoggedIn} />
          </MemoryRouter>
        </QueryClientWrapper>
      </LocaleProvider>
    );
  }

  it('offers a signed-in visitor to report the photo of the profile', () => {
    renderTools(false, true);

    expect(screen.getByRole('button', { name: 'Plus d’actions' })).toBeInTheDocument();
  });

  it.each([
    ['on your own profile', true, true],
    ['to a signed-out visitor', false, false],
  ])('never offers to report a photo %s', (_case, isOwnProfile, isLoggedIn) => {
    renderTools(isOwnProfile, isLoggedIn);

    expect(screen.queryByRole('button', { name: 'Plus d’actions' })).not.toBeInTheDocument();
  });
});
