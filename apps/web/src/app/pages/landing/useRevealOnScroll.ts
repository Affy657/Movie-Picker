import { useEffect, type RefObject } from 'react';

const REVEAL_SAFETY_MS = 2500;
const REVEAL_STAGGER_MS = 70;
const REVEAL_STAGGER_MAX = 3;

function showInstantly(el: HTMLElement): void {
  el.style.transition = 'none';
  el.dataset.shown = 'true';
}

export function useRevealOnScroll(
  rootRef: RefObject<HTMLElement | null>,
  revealClass: string | undefined
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !revealClass) return;

    const items = [...root.querySelectorAll<HTMLElement>(`.${revealClass}`)];
    const showAll = (): void => {
      for (const el of items) showInstantly(el);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    let isFirstCallback = true;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleAtLoad = isFirstCallback;
        isFirstCallback = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (visibleAtLoad) showInstantly(el);
          else el.dataset.shown = 'true';
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    items.forEach((el, index) => {
      const step = Math.min(index % 4, REVEAL_STAGGER_MAX);
      el.style.transitionDelay = `${step * REVEAL_STAGGER_MS}ms`;
      observer.observe(el);
    });

    const safety = setTimeout(showAll, REVEAL_SAFETY_MS);

    return () => {
      clearTimeout(safety);
      observer.disconnect();
    };
  }, [rootRef, revealClass]);
}
