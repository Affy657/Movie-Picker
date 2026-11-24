import { useLayoutEffect, useRef, useState } from 'react';

export function useNarrowerThan<T extends HTMLElement>(threshold: number) {
  const ref = useRef<T>(null);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const initialWidth = element.getBoundingClientRect().width;
    if (initialWidth) setNarrow(initialWidth < threshold);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setNarrow(width < threshold);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, narrow };
}
