import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { whenPageImagesSettle } from '@/app/components/whenPageImagesSettle';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

const reloadCurrentPage = () => globalThis.location.reload();

type PageWait = (onSettled: () => void) => () => void;

export default function PwaAutoUpdate({
  reloadPage = reloadCurrentPage,
  waitForPage = whenPageImagesSettle,
}: Readonly<{ reloadPage?: () => void; waitForPage?: PageWait }>) {
  const [pageSettled, setPageSettled] = useState(false);
  useEffect(() => waitForPage(() => setPageSettled(true)), [waitForPage]);
  return pageSettled ? <ServiceWorkerUpdates reloadPage={reloadPage} /> : null;
}

function ServiceWorkerUpdates({ reloadPage }: Readonly<{ reloadPage: () => void }>) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const mountedRef = useRef(false);
  const pendingRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      if (mountedRef.current) setRegistration(r);
      else pendingRegistrationRef.current = r;
    },
  });

  useEffect(() => {
    mountedRef.current = true;
    if (pendingRegistrationRef.current) setRegistration(pendingRegistrationRef.current);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!registration) return;

    const checkForUpdate = () => {
      if (registration.installing || !navigator.onLine) return;
      registration.update().catch(() => {});
    };
    const checkForUpdateIfVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkForUpdateIfVisible);
    window.addEventListener('online', checkForUpdate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkForUpdateIfVisible);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [registration]);

  useEffect(() => {
    if (!needRefresh) return;

    const container = navigator.serviceWorker;
    let applied = false;
    container?.addEventListener('controllerchange', reloadPage);

    const applyWhenHidden = () => {
      if (applied || document.visibilityState !== 'hidden') return;
      applied = true;
      updateServiceWorker(true).catch(() => {
        applied = false;
      });
    };

    applyWhenHidden();
    document.addEventListener('visibilitychange', applyWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', applyWhenHidden);
      container?.removeEventListener('controllerchange', reloadPage);
    };
  }, [needRefresh, updateServiceWorker, reloadPage]);

  return null;
}
