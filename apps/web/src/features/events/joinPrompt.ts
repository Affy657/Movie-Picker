import { useEffect, useState } from 'react';

export const JOIN_PROMPT_ANCHOR_ID = 'event-join';

const JOIN_PROMPT_EVENT = 'moviepicker:join-prompt';

export function promptToJoinEvent(): void {
  const anchor = document.getElementById(JOIN_PROMPT_ANCHOR_ID);
  if (!anchor) return;
  const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  anchor.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  anchor.querySelector<HTMLElement>('button, a[href]')?.focus({ preventScroll: true });
  anchor.dispatchEvent(new CustomEvent(JOIN_PROMPT_EVENT, { bubbles: true }));
}

export function useJoinPromptCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const countPrompt = () => setCount((previous) => previous + 1);
    document.addEventListener(JOIN_PROMPT_EVENT, countPrompt);
    return () => document.removeEventListener(JOIN_PROMPT_EVENT, countPrompt);
  }, []);
  return count;
}
