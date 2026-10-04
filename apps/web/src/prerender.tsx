import { createRoot } from 'react-dom/client';
import { StaticRouter } from 'react-router';
import { AppProviders, AppRoutesWithErrorBoundary } from '@/app/App';
import { loadLocale } from '@/shared/i18n';
import { PRERENDER_LOCALE } from '@/app/prerenderRoutes';

export {
  PRERENDERED_ROUTES,
  PRERENDERED_ROUTE_CHUNKS,
  PRERENDERED_FOR_FIRST_PAINT_ONLY,
} from '@/app/prerenderRoutes';

export interface PrerenderedPage {
  head: string;
  body: string;
}

const READY_TIMEOUT_MS = 15_000;
const READY_POLL_MS = 25;
const EFFECT_FLUSH_TURNS = 5;

function nextTurns(count: number): Promise<void> {
  if (count <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => nextTurns(count - 1));
}

function waitForHeading(container: HTMLElement): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (container.querySelector('h1')) resolve();
      else if (Date.now() >= deadline)
        reject(new Error(`no <h1> rendered after ${READY_TIMEOUT_MS} ms`));
      else setTimeout(poll, READY_POLL_MS);
    };
    poll();
  });
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
  await nextTurns(EFFECT_FLUSH_TURNS);

  const page = { head: document.head.innerHTML, body: container.innerHTML };
  root.unmount();
  return page;
}
