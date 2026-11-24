import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAfterIdle } from '@/shared/hooks/useAfterIdle';
import styles from './HomeRowWhenNear.module.css';

const LOAD_AHEAD_MARGIN = '50% 0px';

export default function HomeRowWhenNear({ children }: Readonly<{ children: ReactNode }>) {
  const idle = useAfterIdle();
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined');
  const placeholderRef = useRef<HTMLDivElement>(null);
  const built = near || idle;

  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (built || !placeholder) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: LOAD_AHEAD_MARGIN }
    );
    observer.observe(placeholder);
    return () => observer.disconnect();
  }, [built]);

  if (built) return children;
  return <div ref={placeholderRef} className={styles.placeholder} aria-hidden="true" />;
}
