import { useEffect, useState } from 'react';

const QUERY = '(hover: hover) and (pointer: fine)';

export function useHasHoverCapability(): boolean {
  const [hasHover, setHasHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setHasHover(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return hasHover;
}
