import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('AccountProfilePage (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(baseUser)));
  });

  it('pre-fills the display name, the bio and the visibility from the account', async () => {
    renderProfile();

    await waitFor(() => expect(screen.getByLabelText(/pseudo/i)).toHaveValue('Alice'));
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

    const pseudoInput = screen.getByLabelText(/pseudo/i);
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

    const pseudoInput = screen.getByLabelText(/pseudo/i);
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

    const pseudoInput = screen.getByLabelText(/pseudo/i);
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

    const pseudoInput = screen.getByLabelText(/pseudo/i);
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

  it('pre-fills the watchlist visibility and saves it when the toggle changes', async () => {
    const user = userEvent.setup();
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...baseUser, isWatchlistPublic: false });
      })
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const toggle = screen.getByRole('switch', { name: /watchlist visible sur mon profil/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toBeEnabled();
    expect(screen.getByText(/movie-picker\.fr\/u\/alice\/watchlist/i)).toBeInTheDocument();

    await user.click(toggle);

    await waitFor(() => expect(patchBody).not.toBeNull());
    expect(patchBody!.isWatchlistPublic).toBe(false);
    expect(patchBody!.isProfilePublic).toBe(true);
  });

  it('refreshes my cached public profile after a save', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ ...baseUser, isWatchlistPublic: false })
      )
    );
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    renderProfile(client);
    await screen.findByDisplayValue('Alice');

    await user.click(screen.getByRole('switch', { name: /watchlist visible sur mon profil/i }));

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.profile.publicAll })
    );
  });

  it('greys out the watchlist setting while the profile is private', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({ ...baseUser, isProfilePublic: false })
      )
    );

    renderProfile();
    await screen.findByDisplayValue('Alice');

    const toggle = screen.getByRole('switch', { name: /watchlist visible sur mon profil/i });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/votre profil est privé/i)).toBeInTheDocument();
  });

  it('refuse un pseudo vide', async () => {
    const user = userEvent.setup();
    renderProfile();
    const pseudoInput = await screen.findByLabelText(/pseudo/i);

    await user.clear(pseudoInput);
    await user.tab();

    expect(await screen.findByText('Le pseudo est requis.')).toBeInTheDocument();
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
});
