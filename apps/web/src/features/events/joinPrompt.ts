export const JOIN_PROMPT_ANCHOR_ID = 'event-join';

export function promptToJoinEvent(): void {
  const anchor = document.getElementById(JOIN_PROMPT_ANCHOR_ID);
  if (!anchor) return;
  const prefersReducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  anchor.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  anchor.querySelector<HTMLElement>('button, a[href]')?.focus({ preventScroll: true });
}
