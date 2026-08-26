import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPwaInstallRuntime } from '@/shared/hooks/usePwaInstall';
import { initPostHog } from '@/shared/analytics/posthog';
import { initSentry } from '@/shared/observability/sentry';
import './index.css';

startPwaInstallRuntime();

function hideSplash(): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('out');
        setTimeout(() => splash.remove(), 260);
      }
    });
  });
}

async function boot(): Promise<void> {
  await initSentry();
  const { default: App } = await import('@/app/App');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  void initPostHog();
  hideSplash();
}

void boot();
