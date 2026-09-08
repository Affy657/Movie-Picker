import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

export default function ScrollToTop() {
  const { key, pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const previousLocation = useRef({ pathname, search });

  useEffect(() => {
    const previous = previousLocation.current;
    previousLocation.current = { pathname, search };

    if (navigationType === 'POP' || hash) return;

    const isFilterChangeOnSamePage = previous.pathname === pathname && previous.search !== search;
    if (isFilterChangeOnSamePage) return;

    window.scrollTo(0, 0);
  }, [key, pathname, search, hash, navigationType]);

  return null;
}
