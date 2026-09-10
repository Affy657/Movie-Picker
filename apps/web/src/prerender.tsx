import { createRoot } from 'react-dom/client';
import { StaticRouter } from 'react-router';
import { AppProviders, AppRoutesWithErrorBoundary } from '@/app/App';
import { loadLocale } from '@/shared/i18n';
import {
  PRERENDER_LOCALE,
  PRERENDERED_ROUTES,
  PRERENDERED_ROUTE_CHUNKS,
  PRERENDERED_FOR_FIRST_PAINT_ONLY,
} from '@/app/prerenderRoutes';

export { PRERENDERED_ROUTES, PRERENDERED_ROUTE_CHUNKS, PRERENDERED_FOR_FIRST_PAINT_ONLY };

export interface PrerenderedPage {
  head: string;
  body: string;
}

const READY_TIMEOUT_MS = 15_000;
const READY_POLL_MS = 25;
const EFFECT_FLUSH_TURNS = 5;

function nextTurn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitForHeading(container: HTMLElement): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (container.querySelector('h1')) return;
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
  }
  throw new Error(`aucun <h1> rendu après ${READY_TIMEOUT_MS} ms`);
}

export async function renderRoute(url: string): Promise<PrerenderedPage> {
  await loadLocale(PRERENDER_LOCALE);

  const container = document.createElement('div');
  container.id = 'root';
  document.body.replaceChildren(container);

  const root = createRoot(container);
  root.render(
    <AppProviders>
      <StaticRouter location={url}>
        <AppRoutesWithErrorBoundary />
      </StaticRouter>
    </AppProviders>
  );

  await waitForHeading(container);
  for (let turn = 0; turn < EFFECT_FLUSH_TURNS; turn += 1) await nextTurn();

  const page = { head: document.head.innerHTML, body: container.innerHTML };
  root.unmount();
  return page;
}
