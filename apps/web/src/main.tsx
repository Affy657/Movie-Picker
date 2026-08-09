import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import { initPostHog } from '@/shared/analytics/posthog';
import { initSentry } from '@/shared/observability/sentry';
import './index.css';

void initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

void initPostHog();

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('out');
      setTimeout(() => splash.remove(), 260);
    }
  });
});
