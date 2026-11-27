import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { onlineManager } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { delay, http, HttpResponse } from 'msw';
import { apiErrorJson, apiJson, type ApiSchemas } from '@/mocks/apiJson';
import { TEST_API_BASE } from '@/mocks/handlers';
import { AppTestProviders } from '@/test-utils/queryWrapper';
import { APP_VERSION } from '@/shared/appVersion';
import { ROUTES } from '@/app/routes';
import ServiceStatusPage from '@/app/pages/ServiceStatusPage';

const READY_URL = `${TEST_API_BASE}/health/ready`;

const READY: ApiSchemas['HealthReadyResponse'] = {
  status: 'ready',
  service: 'movie-picker-api',
  release: 'a58726d3f1c2',
  dependencies: [{ name: 'mongodb', status: 'ok', durationMs: 12 }],
};

const DATABASE_DOWN: ApiSchemas['HealthReadyResponse'] = {
  ...READY,
  status: 'unavailable',
  dependencies: [{ name: 'mongodb', status: 'unavailable', durationMs: 2000 }],
};

const answersReady = () => http.get(READY_URL, () => apiJson<'HealthReadyResponse'>(READY));
const answersDatabaseDown = () =>
  http.get(READY_URL, () => apiJson<'HealthReadyResponse'>(DATABASE_DOWN, { status: 503 }));
const doesNotAnswer = () => http.get(READY_URL, () => HttpResponse.error());

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  onlineManager.setOnline(true);
  localStorage.removeItem('moviepicker-locale');
  vi.useRealTimers();
});
afterAll(() => server.close());

function renderPage() {
  return render(
    <AppTestProviders>
      <MemoryRouter initialEntries={[ROUTES.serviceStatus]}>
        <ServiceStatusPage />
      </MemoryRouter>
    </AppTestProviders>
  );
}

function stateOf(component: string) {
  const services = screen.getByRole('list', { name: 'Services vérifiés' });
  const row = within(services).getByText(component).closest('li') as HTMLElement;
  return row.textContent ?? '';
}

describe('ServiceStatusPage', () => {
  it('says everything works when the API and the database answer', async () => {
    server.use(answersReady());

    renderPage();

    expect(screen.getByRole('heading', { name: 'État du service', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Tout fonctionne')).toBeInTheDocument();
    expect(stateOf('Site')).toContain('Opérationnel');
    expect(stateOf('API')).toContain('Opérationnelle');
    expect(stateOf('Base de données')).toContain('Opérationnelle');
  });

  it('shows the app version and the build the API serves', async () => {
    server.use(answersReady());

    renderPage();

    expect(await screen.findByText('API a58726d')).toBeInTheDocument();
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText('Vérifié à l’instant')).toBeInTheDocument();
  });

  it('says the service is disrupted when the database does not answer', async () => {
    server.use(answersDatabaseDown());

    renderPage();

    expect(await screen.findByText('Service perturbé')).toBeInTheDocument();
    expect(stateOf('API')).toContain('Opérationnelle');
    expect(stateOf('Base de données')).toContain('Indisponible');
  });

  it('says the service is unavailable when the API does not answer', async () => {
    server.use(doesNotAnswer());

    renderPage();

    expect(await screen.findByText('Service indisponible')).toBeInTheDocument();
    expect(stateOf('Site')).toContain('Opérationnel');
    expect(stateOf('API')).toContain('Indisponible');
    expect(stateOf('Base de données')).toContain('Impossible à vérifier');
  });

  it('keeps the site operational while the first check runs', async () => {
    server.use(
      http.get(READY_URL, async () => {
        await delay('infinite');
        return apiJson<'HealthReadyResponse'>(READY);
      })
    );

    renderPage();

    expect(await screen.findByText('Vérification en cours…')).toBeInTheDocument();
    expect(stateOf('Site')).toContain('Opérationnel');
    expect(stateOf('API')).toContain('Vérification…');
  });

  it('marks nothing as down and cannot check while the visitor is offline', async () => {
    onlineManager.setOnline(false);
    server.use(answersReady());

    renderPage();

    expect(await screen.findByText('Vous êtes hors ligne')).toBeInTheDocument();
    expect(stateOf('API')).toContain('Impossible à vérifier');
    expect(screen.getByRole('button', { name: 'Vérifier maintenant' })).toBeDisabled();
  });

  it('checks again on demand', async () => {
    server.use(answersReady());
    renderPage();
    await screen.findByText('Tout fonctionne');

    server.use(doesNotAnswer());
    await userEvent.click(screen.getByRole('button', { name: 'Vérifier maintenant' }));

    expect(await screen.findByText('Service indisponible')).toBeInTheDocument();
  });

  it('keeps the last known state when the checks are rate limited', async () => {
    let calls = 0;
    server.use(
      http.get(READY_URL, () => {
        calls += 1;
        return calls === 1
          ? apiJson<'HealthReadyResponse'>(READY)
          : apiErrorJson(429, 'rate_limited');
      })
    );
    renderPage();
    await screen.findByText('Tout fonctionne');

    await userEvent.click(screen.getByRole('button', { name: 'Vérifier maintenant' }));

    await vi.waitFor(() => expect(calls).toBe(2));
    expect(screen.getByText('Tout fonctionne')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vérifier maintenant' })).toBeEnabled();
  });

  it('checks again every 30 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(answersReady());
    renderPage();
    await screen.findByText('Tout fonctionne');

    server.use(answersDatabaseDown());
    await act(() => vi.advanceTimersByTimeAsync(30_000));

    expect(await screen.findByText('Service perturbé')).toBeInTheDocument();
  });

  it('tells how long ago the last check ran', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    server.use(answersReady());
    renderPage();
    await screen.findByText('Vérifié à l’instant');

    await act(() => vi.advanceTimersByTimeAsync(12_000));

    expect(screen.getByText('Vérifié il y a 12 secondes')).toBeInTheDocument();
  });

  it('speaks English when the visitor chose it', async () => {
    localStorage.setItem('moviepicker-locale', 'en');
    server.use(answersReady());

    renderPage();

    expect(await screen.findByText('All systems working')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Service status', level: 1 })).toBeInTheDocument();
  });
});
