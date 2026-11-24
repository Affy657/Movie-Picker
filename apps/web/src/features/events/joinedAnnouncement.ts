import { createContext, useCallback, useContext, useState } from 'react';

export const MOVIES_HEADING_ID = 'event-movies-heading';

export function focusMoviesIfFocusWasDropped(): void {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  document.getElementById(MOVIES_HEADING_ID)?.focus({ preventScroll: true });
}

export const JoinedAnnouncementContext = createContext<() => void>(() => undefined);

export function useAnnounceJoined(): () => void {
  return useContext(JoinedAnnouncementContext);
}

export function useJoinedNotice(): { shown: boolean; show: () => void; dismiss: () => void } {
  const [shown, setShown] = useState(false);
  const show = useCallback(() => setShown(true), []);
  const dismiss = useCallback(() => setShown(false), []);
  return { shown, show, dismiss };
}
