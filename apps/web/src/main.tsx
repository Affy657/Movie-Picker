import { StrictMode, startTransition } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { showBootFailure } from '@/shared/pwa/bootFailure';
import { captureMovedOriginMarker } from '@/shared/pwa/movedOrigin';
import { reloadIfStaleBuild } from '@/shared/pwa/staleBuildReload';
import { captureException, scheduleSentryStart } from '@/shared/observability/sentry';
import { reportContentSecurityPolicyViolations } from '@/shared/observability/cspViolations';
import { loadLocale, preferredLocale } from '@/shared/i18n';
import './index.css';

function loadColorMixFallback(): void {
  if (CSS.supports('color', 'color-mix(in srgb, currentColor 50%, transparent)')) return;
  import('virtual:color-mix-fallback.css').catch(captureException);
}

reportContentSecurityPolicyViolations(document, captureException);

loadColorMixFallback();

startPwaInstallRuntime();
captureMovedOriginMarker(window.location, (url) =>
  window.history.replaceState(window.history.state, '', url)
);

const SPLASH_REMOVAL_FALLBACK_MS = 1000;

function hideSplash(): void {
  let removed = false;
  const removeSplash = (): void => {
    if (removed) return;
    removed = true;
    document.getElementById('splash')?.remove();
  };
  requestAnimationFrame(() => requestAnimationFrame(removeSplash));
  setTimeout(removeSplash, SPLASH_REMOVAL_FALLBACK_MS);
}

function isPrerenderedDocument(): boolean {
  return document.getElementById('splash') === null;
}

async function mountApp(): Promise<void> {
  const translationsReady = loadLocale(preferredLocale());
  const renderableStartupRoute = import('@/app/routeChunks').then(({ preloadStartupRoute }) => {
    const startupPageLoaded = preloadStartupRoute(window.location.pathname);
    return isPrerenderedDocument() ? startupPageLoaded : undefined;
  });
  const [{ default: App }] = await Promise.all([
    import('@/app/App'),
    translationsReady,
    renderableStartupRoute,
  ]);
  const root = createRoot(document.getElementById('root')!);
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  );
  if (isPrerenderedDocument()) startTransition(() => root.render(app));
  else root.render(app);
}

function boot(): void {
  mountApp()
    .catch((error: unknown) => {
      captureException(error);
      showBootFailure(document.getElementById('root'), preferredLocale());
      reloadIfStaleBuild(error);
    })
    .finally(() => {
      hideSplash();
      scheduleSentryStart();
    });
}

boot();
