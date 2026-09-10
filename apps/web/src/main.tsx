import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { initPostHog } from '@/shared/analytics/posthog';
import { captureException, initSentry } from '@/shared/observability/sentry';
import { loadLocale, preferredLocale } from '@/shared/i18n';
import './index.css';

startPwaInstallRuntime();

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
  await initSentry();
  const { default: App } = await import('@/app/App');
  await translationsReady;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  void initPostHog();
  hideSplash();
}

boot().catch((error: unknown) => {
  hideSplash();
  captureException(error);
});
