import { createContext, useContext, useLayoutEffect } from 'react';

export const TOP_NOTICE_ORDER = [
  'sessionExpired',
  'signOutPending',
  'accountDeleted',
  'inAppBrowser',
  'movedOrigin',
  'languageSuggestion',
] as const;

export type TopNoticeId = (typeof TOP_NOTICE_ORDER)[number];

type TopNoticeQueue = {
  shown: TopNoticeId | undefined;
  enter: (id: TopNoticeId) => void;
  leave: (id: TopNoticeId) => void;
};

export const TopNoticeQueueContext = createContext<TopNoticeQueue | null>(null);

export function useTopNoticeTurn(id: TopNoticeId, wanted: boolean): boolean {
  const queue = useContext(TopNoticeQueueContext);
  const enter = queue?.enter;
  const leave = queue?.leave;

  useLayoutEffect(() => {
    if (!wanted || !enter || !leave) return;
    enter(id);
    return () => leave(id);
  }, [id, wanted, enter, leave]);

  if (!queue) return wanted;
  return wanted && queue.shown === id;
}
