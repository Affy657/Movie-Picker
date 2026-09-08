import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { initPostHog } from '@/shared/analytics/posthog';
import { initSentry } from '@/shared/observability/sentry';
import { loadLocale, preferredLocale } from '@/shared/i18n';
import './index.css';

startPwaInstallRuntime();

function hideSplash(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById('splash')?.remove();
    });
  });
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

void boot();
