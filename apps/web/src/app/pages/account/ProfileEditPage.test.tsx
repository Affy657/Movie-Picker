import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import AccountPage from '@/app/pages/account/AccountPage';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import { queryKeys } from '@/shared/hooks/queryKeys';
import type { QueryClient } from '@tanstack/react-query';
import { setSessionHint } from '@/features/auth/session-hint';
import { createAppQueryClient } from '@/app/appQueryClient';

const baseUser = {
  userId: 'u1',
  displayName: 'Alice',
  emailMasked: 'a***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  avatarId: 'alpha',
  handle: 'alice',
  bio: 'Ma bio',
  isProfilePublic: true,
  isWatchlistPublic: true,
};

function renderProfile(client?: QueryClient) {
  return render(
    <AppTestProviders client={client}>
      <MemoryRouter initialEntries={['/settings/profil']}>
        <Routes>
          <Route path="/settings/*" element={<AccountPage />} />
        </Routes>
      </MemoryRouter>
    </AppTestProviders>
  );
}

describe('ProfileEditPage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    sessionStorage.clear();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(baseUser)));
  });

  it('keeps the bio being typed through an expired session and saves it once back', async () => {
    const user = userEvent.setup();
    let sessionAlive = true;
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        sessionAlive
          ? HttpResponse.json(baseUser)
          : HttpResponse.json({ reason: 'unauthorized' }, { status: 401 })
      ),
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        if (!sessionAlive) {
          return HttpResponse.json({ reason: 'unauthorized' }, { status: 401 });
        }
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        return HttpResponse.json({ ...baseUser, ...body });
      })
    );
    const client = createAppQueryClient();
    renderProfile(client);
    const bioInput = await screen.findByLabelText(/bio/i);

    sessionAlive = false;
    await user.clear(bioInput);
    await user.type(bioInput, 'Brouillon gardé');
    await user.tab();

    expect(
      await screen.findByRole('heading', { level: 1, name: /paramètres/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/bio/i)).not.toBeInTheDocument();

    sessionAlive = true;
    setSessionHint();
    await client.invalidateQueries({ queryKey: queryKeys.auth.me });

    expect(await screen.findByLabelText(/bio/i)).toHaveValue('Brouillon gardé');
    await waitFor(() => expect(patchBodies.at(-1)?.bio).toBe('Brouillon gardé'));
  });

  it('pre-fills the display name, the bio and the visibility from the account', async () => {
    renderProfile();

    await waitFor(() => expect(screen.getByLabelText('Nom affiché')).toHaveValue('Alice'));
    expect(screen.getByLabelText('Pseudo')).toHaveValue('alice');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Ma bio');
    expect(screen.getByRole('switch', { name: /profil public/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('saves the display name automatically on blur', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, displayName: 'Alicia' });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const pseudoInput = screen.getByLabelText('Nom affiché');
    await user.clear(pseudoInput);
    await user.type(pseudoInput, 'Alicia');
    await user.tab();

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.displayName).toBe('Alicia');
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
  });

  it('autosaves the last keystroke and keeps it in the field once saved', async () => {
    const user = userEvent.setup();
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        return HttpResponse.json({ ...baseUser, ...body });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const pseudoInput = screen.getByLabelText('Nom affiché');
    await user.clear(pseudoInput);
    await user.type(pseudoInput, 'Alicia');

    await waitFor(() => expect(patchBodies).toHaveLength(1));
    expect(patchBodies[0]!.displayName).toBe('Alicia');
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    expect(pseudoInput).toHaveValue('Alicia');
  });

  it('autosaves the last keystroke of the bio', async () => {
    const user = userEvent.setup();
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        return HttpResponse.json({ ...baseUser, ...body });
      })
    );

    renderProfile();
    const bioInput = await screen.findByLabelText(/bio/i);
    await user.clear(bioInput);
    await user.type(bioInput, 'Cinéphile');

    await waitFor(() => expect(patchBodies).toHaveLength(1));
    expect(patchBodies[0]!.bio).toBe('Cinéphile');
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    expect(bioInput).toHaveValue('Cinéphile');
  });

  it('clears the bio with an empty string, which the API reads as a removal', async () => {
    const user = userEvent.setup();
    const patchBodies: Record<string, unknown>[] = [];
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        return HttpResponse.json({
          ...baseUser,
          ...body,
          bio: body.bio === '' ? null : baseUser.bio,
        });
      })
    );

    renderProfile();
    const bioInput = await screen.findByLabelText(/bio/i);
    await user.clear(bioInput);

    await waitFor(() => expect(patchBodies).toHaveLength(1));
    expect(patchBodies[0]!.bio).toBe('');
    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    expect(bioInput).toHaveValue('');
  });

  it('keeps a visibility change made while the name is still saving', async () => {
    const user = userEvent.setup();
    const patchBodies: Record<string, unknown>[] = [];
    let releaseFirstSave: () => void = () => undefined;
    const firstSaveReleased = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        if (patchBodies.length === 1) await firstSaveReleased;
        return HttpResponse.json({ ...baseUser, ...body });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const pseudoInput = screen.getByLabelText('Nom affiché');
    await user.clear(pseudoInput);
    await user.type(pseudoInput, 'Alicia');
    await user.tab();
    await waitFor(() => expect(patchBodies).toHaveLength(1));

    const visibility = screen.getByRole('switch', { name: /profil public/i });
    await user.click(visibility);
    releaseFirstSave();

    await waitFor(() => expect(patchBodies).toHaveLength(2));
    expect(patchBodies[1]).toMatchObject({ displayName: 'Alicia', isProfilePublic: false });
    await waitFor(() => expect(visibility).toHaveAttribute('aria-checked', 'false'));
    expect(pseudoInput).toHaveValue('Alicia');
  });

  it('keeps typing that happens while the previous save is in flight', async () => {
    const user = userEvent.setup();
    const patchBodies: Record<string, unknown>[] = [];
    let releaseFirstSave: () => void = () => undefined;
    const firstSaveReleased = new Promise<void>((resolve) => {
      releaseFirstSave = resolve;
    });
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        patchBodies.push(body);
        if (patchBodies.length === 1) await firstSaveReleased;
        return HttpResponse.json({ ...baseUser, ...body });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const pseudoInput = screen.getByLabelText('Nom affiché');
    await user.clear(pseudoInput);
    await user.type(pseudoInput, 'Alicia');
    await user.tab();
    await waitFor(() => expect(patchBodies).toHaveLength(1));

    await user.type(pseudoInput, ' B');
    releaseFirstSave();

    await waitFor(() => expect(patchBodies).toHaveLength(2));
    expect(patchBodies[1]!.displayName).toBe('Alicia B');
    expect(pseudoInput).toHaveValue('Alicia B');
  });

  it('saves the visibility immediately when the toggle changes', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, isProfilePublic: false });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    await user.click(screen.getByRole('switch', { name: /profil public/i }));

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.isProfilePublic).toBe(false);
  });

  it('leaves the visibility of À voir to the ⋯ menu of the list, not to the settings', async () => {
    renderProfile();
    await screen.findByDisplayValue('Alice');

    expect(screen.queryByRole('switch', { name: /watchlist/i })).toBeNull();
    expect(screen.queryByText(/movie-picker\.fr\/u\/alice\/watchlist/i)).toBeNull();
  });

  it('refreshes my cached public profile after a save', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ ...baseUser, isProfilePublic: false })
      )
    );
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderProfile(client);
    await screen.findByDisplayValue('Alice');

    await user.click(screen.getByRole('switch', { name: /profil public/i }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.profile.publicAll })
    );
  });

  it('refuses an empty name', async () => {
    const user = userEvent.setup();
    renderProfile();
    const pseudoInput = await screen.findByLabelText('Nom affiché');

    await user.clear(pseudoInput);
    await user.tab();

    expect(await screen.findByText('Le nom affiché est requis.')).toBeInTheDocument();
  });

  it('shows the bio hint only within the last 20 characters', async () => {
    renderProfile();
    const bioInput = await screen.findByLabelText(/bio/i);

    expect(screen.queryByText(/caractères restants/i)).toBeNull();

    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, 'x'.repeat(125));

    await waitFor(() => {
      expect(screen.getByText(/caractères restants/i)).toBeInTheDocument();
    });
  });

  it('edits the profile on a page of its own, outside the settings menu, with a way back', async () => {
    renderProfile();
    await screen.findByDisplayValue('Alice');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Modifier le profil' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mon profil' })).toHaveAttribute('href', '/u/alice');
    expect(screen.queryByRole('navigation', { name: /rubriques/i })).toBeNull();
  });

  it('shows the name and the bio being typed in the preview of the profile', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) =>
        HttpResponse.json({ ...baseUser, ...((await request.json()) as object) })
      )
    );

    renderProfile();
    const preview = await screen.findByRole('region', { name: 'Aperçu de votre profil' });
    await user.clear(screen.getByLabelText('Nom affiché'));
    await user.type(screen.getByLabelText('Nom affiché'), 'Alicia');
    await user.clear(screen.getByLabelText(/bio/i));
    await user.type(screen.getByLabelText(/bio/i), 'Cinéphile');

    expect(within(preview).getByText('Alicia')).toBeInTheDocument();
    expect(within(preview).getByText('Cinéphile')).toBeInTheDocument();
    expect(within(preview).getByText('@alice')).toBeInTheDocument();
  });

  it('lets me pick my colour on the page', async () => {
    renderProfile();

    expect(await screen.findByRole('radiogroup', { name: 'Couleur' })).toBeInTheDocument();
  });

  describe('handle', () => {
    function availability(body: Record<string, unknown>, status = 200) {
      return http.get(`${TEST_API_V1}/users/me/handle-availability`, () =>
        HttpResponse.json(body, { status })
      );
    }

    it('says a free handle is available and only takes it when asked', async () => {
      const user = userEvent.setup();
      let patched: Record<string, unknown> | null = null;
      server.use(
        availability({ handle: 'alicia', available: true, reason: null }),
        http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
          patched = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ...baseUser, handle: 'alicia' });
        })
      );

      renderProfile();
      const field = await screen.findByLabelText('Pseudo');
      await user.clear(field);
      await user.type(field, 'Alicia');

      expect(await screen.findByText('Disponible')).toBeInTheDocument();
      expect(
        screen.getByText('L’ancien lien de votre profil ne marchera plus.')
      ).toBeInTheDocument();
      expect(patched).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Utiliser ce pseudo' }));

      await waitFor(() => expect(patched).toEqual({ handle: 'alicia' }));
      expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    });

    it('says when a handle is already taken', async () => {
      const user = userEvent.setup();
      server.use(availability({ handle: 'bob', available: false, reason: 'handle_taken' }));

      renderProfile();
      const field = await screen.findByLabelText('Pseudo');
      await user.clear(field);
      await user.type(field, 'bob');

      expect(await screen.findByText('Ce pseudo est déjà pris.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Utiliser ce pseudo' })).toBeNull();
    });

    it('explains why the rules refuse a handle', async () => {
      const user = userEvent.setup();
      server.use(
        availability(
          {
            error: 'Handle is too short',
            reason: 'handle_too_short',
            code: 400,
            params: { min: 3 },
          },
          400
        )
      );

      renderProfile();
      const field = await screen.findByLabelText('Pseudo');
      await user.clear(field);
      await user.type(field, 'ab');

      expect(
        await screen.findByText('Le pseudo doit contenir au moins 3 caractères.')
      ).toBeInTheDocument();
    });

    it('checks nothing while the handle is still mine', async () => {
      let checked = false;
      server.use(
        http.get(`${TEST_API_V1}/users/me/handle-availability`, () => {
          checked = true;
          return HttpResponse.json({ handle: 'alice', available: true, reason: null });
        })
      );

      renderProfile();
      await screen.findByDisplayValue('alice');

      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(checked).toBe(false);
      expect(screen.queryByText('Disponible')).toBeNull();
    });
  });
});
