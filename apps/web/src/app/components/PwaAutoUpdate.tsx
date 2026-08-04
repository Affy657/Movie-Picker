import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export default function PwaAutoUpdate() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const mountedRef = useRef(false);
  const pendingRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useRegisterSW({
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

    const intervalId = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', checkForUpdate);
    window.addEventListener('online', checkForUpdate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkForUpdate);
      window.removeEventListener('online', checkForUpdate);
    };
  }, [registration]);

  return null;
}
