import { useCallback, useRef, type KeyboardEvent } from 'react';

export function useTablistKeyboard<T extends string>(
  tabs: readonly T[],
  active: T,
  onChange: (tab: T) => void
) {
  const refsRef = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const registerTab = useCallback(
    (tab: T) => (el: HTMLButtonElement | null) => {
      refsRef.current[tab] = el;
    },
    []
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const currentIndex = tabs.indexOf(active);
      let nextIndex: number;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const next = tabs[nextIndex];
      if (!next) return;
      onChange(next);
      refsRef.current[next]?.focus();
    },
    [tabs, active, onChange]
  );

  const tabIndexFor = useCallback((tab: T) => (tab === active ? 0 : -1), [active]);

  return { onKeyDown, registerTab, tabIndexFor };
}
