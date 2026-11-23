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

function renderGate(entry: string = ROUTES.watchlist) {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[entry]}>
        <SessionGate
          icon={<Bookmark aria-hidden size={28} />}
          headingKey="watchlist.title"
          titleKey="watchlist.signedOutTitle"
          messageKey="watchlist.signedOutMessage"
        >
          <AuthedPage />
        </SessionGate>
      </MemoryRouter>
    </AppTestProviders>
  );
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  resetSessionHintMemoryForTests();
  clearSessionHint();
  pageRenders = 0;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SessionGate', () => {
  it('renders the signed-out state without ever mounting the page when no session is possible', async () => {
    renderGate();

    expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
    expect(screen.queryByText('contenu authentifié')).not.toBeInTheDocument();
    expect(pageRenders).toBe(0);
  });

  it('redirects to sign-in while keeping the requested page as the return', async () => {
    renderGate();

    expect(await screen.findByRole('link', { name: /^j’ai déjà un compte$/i })).toHaveAttribute(
      'href',
      '/login?returnTo=%2Fwatchlist'
    );
    expect(screen.getByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
      'href',
      '/register?returnTo=%2Fwatchlist'
    );
  });

  it('keeps the query and the anchor of the requested page for the return', async () => {
    renderGate(`${ROUTES.watchlist}?tri=titre#films`);

    expect(await screen.findByRole('link', { name: /^créer un compte$/i })).toHaveAttribute(
      'href',
      `/register?returnTo=${encodeURIComponent('/watchlist?tri=titre#films')}`
    );
  });

  it('names the tab after the page and keeps the signed-out state out of search engines', async () => {
    renderGate();

    await screen.findByRole('heading', { level: 2 });
    await waitFor(() => expect(document.title).toBe('À voir | Movie Picker'));
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow'
    );
  });

  it('gives the sign-in card the same width on every page', async () => {
    renderGate();

    await screen.findByRole('heading', { level: 2 });
    expect(screen.getByRole('main').style.getPropertyValue('--page-max-width')).toBe('');
  });

  it('mounts the page when the session is confirmed', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => HttpResponse.json(ME)));

    renderGate();

    expect(await screen.findByText('contenu authentifié')).toBeInTheDocument();
  });

  it('reports a failed session check instead of offering to sign in', async () => {
    setSessionHint();
    server.use(http.get(`${TEST_API_V1}/auth/me`, () => new HttpResponse(null, { status: 500 })));

    renderGate();

    await waitFor(() => expect(screen.queryByText('contenu authentifié')).not.toBeInTheDocument());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
