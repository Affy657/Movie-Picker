import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { apiJson, type ApiSchemas } from '@/mocks/apiJson';
import type { UserProfile } from '@/features/auth/types';
import { buildUserProfile } from '@/test-utils/userProfile';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { setSessionHint } from '@/features/auth/session-hint';

const baseUser = buildUserProfile({
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'pink',
  avatarId: 'alpha',
  handle: 'alice',
  bio: 'Ma bio',
  isProfilePublic: true,
  isWatchlistPublic: true,
  banner: null,
  bannerPhotoUrl: null,
});

const DUNE: ApiSchemas['ProfileBannerResponse'] = {
  source: 'film',
  imageUrl: 'https://image.tmdb.org/t/p/w1280/sunset.jpg',
  tmdbId: 693134,
  title: 'Dune : Deuxième partie',
};

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={['/settings/profil']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileEditPreview (MSW)', () => {
  const server = setupServer();
  let me: UserProfile;

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    me = { ...baseUser };
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => apiJson<'UserProfileResponse'>(me)));
  });

  it('previews the profile in my colour, avatar ringed', async () => {
    const { container } = renderPage();

    const preview = await screen.findByRole('region', { name: 'Aperçu de votre profil' });
    expect(preview.closest('.accent-pink')).not.toBeNull();
    expect(container.querySelector('img.accent-pink')).not.toBeNull();
  });

  it('offers to add a banner when there is none, which opens its choice', async () => {
    const user = userEvent.setup();
    renderPage();

    const preview = await screen.findByRole('region', { name: 'Aperçu de votre profil' });
    await user.click(within(preview).getByRole('button', { name: 'Ajouter une bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
  });

  it('shows the current banner with a way to change it', async () => {
    const user = userEvent.setup();
    me = { ...baseUser, banner: DUNE };
    renderPage();

    const preview = await screen.findByRole('region', { name: 'Aperçu de votre profil' });
    expect(within(preview).getByTestId('profile-banner-image')).toHaveAttribute(
      'src',
      DUNE.imageUrl
    );
    await user.click(within(preview).getByRole('button', { name: 'Bannière' }));

    expect(await screen.findByRole('dialog', { name: 'Bannière' })).toBeInTheDocument();
  });

  it('opens the choice of the avatar from the preview', async () => {
    const user = userEvent.setup();
    renderPage();

    const preview = await screen.findByRole('region', { name: 'Aperçu de votre profil' });
    await user.click(within(preview).getByRole('button', { name: 'Changer l’avatar' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
