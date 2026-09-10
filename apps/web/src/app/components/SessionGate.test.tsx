import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { Bookmark } from 'lucide-react';
import SessionGate from '@/app/components/SessionGate';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { TEST_API_V1 } from '@/mocks/handlers';
import {
  clearSessionHint,
  resetSessionHintMemoryForTests,
  setSessionHint,
} from '@/features/auth/session-hint';
import { ROUTES } from '@/app/routes';

const ME = {
  userId: 'u-gate',
  displayName: 'Gate',
  emailMasked: 'g***@test.local',
  uiTheme: 'system',
  accentColor: 'default',
  ratingScale: 'ten',
};

let pageRenders = 0;

function AuthedPage() {
  pageRenders += 1;
  return <p>contenu authentifié</p>;
}

function renderGate() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[ROUTES.watchlist]}>
        <SessionGate
          icon={<Bookmark aria-hidden size={28} />}
          headingKey="watchlist.title"
          titleKey="watchlist.signedOutTitle"
          messageKey="watchlist.signedOutMessage"
          returnTo={ROUTES.watchlist}
        >
          <AuthedPage />
        </SessionGate>
      </MemoryRouter>
    </AppTestProviders>
  );
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  resetSessionHintMemoryForTests();
  clearSessionHint();
  pageRenders = 0;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SessionGate', () => {
  it("rend l'état déconnecté sans jamais monter la page quand aucune session n'est possible", async () => {
    renderGate();

    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.queryByText('contenu authentifié')).not.toBeInTheDocument();
    expect(pageRenders).toBe(0);
  });

  it('renvoie vers la connexion en gardant la page demandée en retour', async () => {
    renderGate();

    expect(await screen.findByRole('link', { name: /^se connecter$/i })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fwatchlist'
    );
    expect(screen.getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fwatchlist'
    );
  });

  it('monte la page quand la session est confirmée', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));

    renderGate();

    expect(await screen.findByText('contenu authentifié')).toBeInTheDocument();
  });

  it('signale un contrôle de session en échec au lieu de proposer de se connecter', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => new HttpResponse(null, { status: 500 })));

    renderGate();

    await waitFor(() => expect(screen.queryByText('contenu authentifié')).not.toBeInTheDocument());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
