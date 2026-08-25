import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import InviteModal from '@/features/events/components/InviteModal';
import type { EligibleFollowItem } from '@/features/events/api/eventsApi';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';

const SLUG = 'soiree-msw';

function renderModal(onClose = vi.fn()) {
  render(
    <AppTestProviders>
      <MemoryRouter>
        <InviteModal open slug={SLUG} onClose={onClose} />
      </MemoryRouter>
    </AppTestProviders>
  );
  return onClose;
}

function follow(overrides: Partial<EligibleFollowItem> = {}): EligibleFollowItem {
  return {
    userId: 'u-bob',
    handle: 'bob',
    displayName: 'Bob',
    avatarId: '',
    isAlreadyParticipant: false,
    isAlreadyInvited: false,
    ...overrides,
  };
}

const guestMe = () =>
  http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json({}, { status: 401 }));

const eligible = (follows: EligibleFollowItem[]) =>
  http.get(`${TEST_API_V1}/events/${SLUG}/invitations/eligible-follows`, () =>
    HttpResponse.json({ follows })
  );

describe('InviteModal (MSW)', () => {
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('liste les follows eligibles', async () => {
    server.use(guestMe(), eligible([follow()]));
    renderModal();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inviter bob/i })).toBeInTheDocument();
  });

  it('invite un follow puis affiche le badge invite', async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      guestMe(),
      eligible([follow()]),
      http.post(`${TEST_API_V1}/events/${SLUG}/invitations`, async () => {
        posted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderModal();
    await screen.findByText('Bob');
    await user.click(screen.getByRole('button', { name: /inviter bob/i }));
    expect(await screen.findByText(/invité/i)).toBeInTheDocument();
    expect(posted).toBe(true);
    expect(screen.queryByRole('button', { name: /inviter bob/i })).not.toBeInTheDocument();
  });

  it("affiche une erreur si l'invitation echoue", async () => {
    const user = userEvent.setup();
    server.use(
      guestMe(),
      eligible([follow()]),
      http.post(`${TEST_API_V1}/events/${SLUG}/invitations`, () =>
        HttpResponse.json({ error: 'Nope', code: 400 }, { status: 400 })
      )
    );
    renderModal();
    await screen.findByText('Bob');
    await user.click(screen.getByRole('button', { name: /inviter bob/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('affiche le badge deja participant sans bouton inviter', async () => {
    server.use(guestMe(), eligible([follow({ isAlreadyParticipant: true })]));
    renderModal();
    expect(await screen.findByText(/déjà participant/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inviter bob/i })).not.toBeInTheDocument();
  });

  it('affiche le badge invite si deja invite', async () => {
    server.use(guestMe(), eligible([follow({ isAlreadyInvited: true })]));
    renderModal();
    expect(await screen.findByText(/invité/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inviter bob/i })).not.toBeInTheDocument();
  });

  it('affiche une erreur de chargement de la liste', async () => {
    server.use(
      guestMe(),
      http.get(`${TEST_API_V1}/events/${SLUG}/invitations/eligible-follows`, () =>
        HttpResponse.json({ error: 'boom', code: 500 }, { status: 500 })
      )
    );
    renderModal();
    expect(await screen.findByText(/impossible de charger la liste/i)).toBeInTheDocument();
  });

  it('etat vide sans lien profil pour un visiteur non connecte', async () => {
    server.use(guestMe(), eligible([]));
    renderModal();
    expect(await screen.findByText(/vous ne suivez encore personne/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /profil/i })).not.toBeInTheDocument();
  });

  it('etat vide avec lien profil pour un utilisateur connecte', async () => {
    server.use(
      http.get(`${TEST_API_V1}/auth/me`, () =>
        HttpResponse.json({
          userId: 'u-me',
          displayName: 'Moi',
          handle: 'moi',
          emailMasked: 'm***@x.fr',
          uiTheme: 'system',
          accentColor: 'default',
        })
      ),
      eligible([])
    );
    renderModal();
    expect(await screen.findByRole('link', { name: /profil/i })).toBeInTheDocument();
  });

  it('appelle onClose au clic sur la croix', async () => {
    const user = userEvent.setup();
    server.use(guestMe(), eligible([]));
    const onClose = renderModal();
    await screen.findByText(/vous ne suivez encore personne/i);
    await user.click(screen.getByRole('button', { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
