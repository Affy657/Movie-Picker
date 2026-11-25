import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { LocaleProvider } from '@/shared/i18n';
import { QueryClientWrapper } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { apiErrorJson } from '@/mocks/apiJson';
import type { PublicProfile } from '@/features/profile/api/profileApi';
import ProfilePhotoReportMenu from './ProfilePhotoReportMenu';

const PHOTO_KEY = 'a'.repeat(32);
const PHOTO_BANNER: PublicProfile['banner'] = {
  source: 'photo',
  imageUrl: `/api/v1/banners/${'b'.repeat(32)}`,
  tmdbId: null,
  title: null,
};

function profileWith(overrides: Partial<PublicProfile> = {}): PublicProfile {
  return {
    handle: 'lea',
    displayName: 'Léa',
    avatarId: `photo:${PHOTO_KEY}`,
    banner: PHOTO_BANNER,
    ...overrides,
  } as PublicProfile;
}

function renderMenu(profile: PublicProfile) {
  return render(
    <LocaleProvider>
      <QueryClientWrapper>
        <ProfilePhotoReportMenu profile={profile} />
      </QueryClientWrapper>
    </LocaleProvider>
  );
}

const reports: unknown[] = [];
const server = setupServer(
  http.post(`${TEST_API_V1}/users/:handle/photo-reports`, async ({ request, params }) => {
    reports.push({ handle: params.handle, body: await request.json() });
    return new HttpResponse(null, { status: 204 });
  })
);

describe('ProfilePhotoReportMenu', () => {
  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  beforeEach(() => {
    localStorage.setItem('moviepicker-locale', 'fr');
    reports.length = 0;
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('offers to report the profile photo and the banner photo the profile shows', async () => {
    const user = userEvent.setup();
    renderMenu(profileWith());

    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));

    const menu = screen.getByRole('menu', { name: 'Plus d’actions' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent)
    ).toEqual(['Signaler la photo de profil', 'Signaler la bannière']);
  });

  it('offers only the photo that is one: a generated avatar or a film banner cannot be reported', async () => {
    const user = userEvent.setup();
    renderMenu(
      profileWith({
        avatarId: 'bolt',
        banner: PHOTO_BANNER,
      })
    );

    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Signaler la bannière',
    ]);
  });

  it('shows no menu when the profile shows no photo', () => {
    renderMenu(
      profileWith({
        avatarId: 'bolt',
        banner: {
          source: 'film',
          imageUrl: 'https://image.tmdb.org/t/p/w1280/dune.jpg',
          tmdbId: 693134,
          title: 'Dune',
        },
      })
    );

    expect(screen.queryByRole('button', { name: 'Plus d’actions' })).not.toBeInTheDocument();
  });

  it('reports the chosen photo once confirmed, then thanks the visitor', async () => {
    const user = userEvent.setup();
    renderMenu(profileWith());

    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Signaler la bannière' }));
    const dialog = await screen.findByRole('dialog', { name: 'Signaler la bannière ?' });
    expect(dialog).toHaveTextContent('Léa ne saura pas qui l’a signalée.');
    expect(reports).toEqual([]);
    await user.click(within(dialog).getByRole('button', { name: 'Signaler' }));

    expect(
      await screen.findByRole('dialog', { name: 'Merci pour votre signalement' })
    ).toBeInTheDocument();
    expect(reports).toEqual([{ handle: 'lea', body: { photo: 'banner' } }]);
    await user.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says why the report did not leave and lets the visitor send it again', async () => {
    server.use(
      http.post(`${TEST_API_V1}/users/:handle/photo-reports`, () =>
        apiErrorJson(429, 'rate_limited')
      )
    );
    const user = userEvent.setup();
    renderMenu(profileWith());

    await user.click(screen.getByRole('button', { name: 'Plus d’actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Signaler la photo de profil' }));
    const dialog = await screen.findByRole('dialog', { name: 'Signaler la photo de profil ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Signaler' }));

    expect(
      await within(dialog).findByText('Trop de requêtes. Réessayez dans un instant.')
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Signaler' })).toBeEnabled();
  });
});
