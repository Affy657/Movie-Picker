import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export function useCloseOnPageChange(close: () => void): void {
  const { pathname } = useLocation();
  const closeRef = useRef(close);
  closeRef.current = close;
  const pathnameShownRef = useRef(pathname);

  useLayoutEffect(() => {
    if (pathnameShownRef.current === pathname) return;
    pathnameShownRef.current = pathname;
    closeRef.current();
  }, [pathname]);
}
