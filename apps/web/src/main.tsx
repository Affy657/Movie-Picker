import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { captureMovedOriginMarker } from '@/shared/pwa/movedOrigin';
import { reloadOnStaleBuild } from '@/shared/pwa/staleBuildReload';
import { captureException, scheduleSentryStart } from '@/shared/observability/sentry';
import { loadLocale, preferredLocale } from '@/shared/i18n';
import './index.css';

reloadOnStaleBuild();
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

async function boot(): Promise<void> {
  const translationsReady = loadLocale(preferredLocale());
  const { default: App } = await import('@/app/App');
  await translationsReady;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  hideSplash();
  scheduleSentryStart();
}

boot().catch((error: unknown) => {
  hideSplash();
  captureException(error);
  scheduleSentryStart();
});
