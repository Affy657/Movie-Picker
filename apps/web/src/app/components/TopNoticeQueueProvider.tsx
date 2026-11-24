import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { TOP_NOTICE_ORDER, TopNoticeQueueContext, type TopNoticeId } from './topNoticeQueue';

export default function TopNoticeQueueProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [waiting, setWaiting] = useState<ReadonlySet<TopNoticeId>>(() => new Set());

  const enter = useCallback((id: TopNoticeId) => {
    setWaiting((current) => (current.has(id) ? current : new Set(current).add(id)));
  }, []);

  const leave = useCallback((id: TopNoticeId) => {
    setWaiting((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const queue = useMemo(
    () => ({ shown: TOP_NOTICE_ORDER.find((id) => waiting.has(id)), enter, leave }),
    [waiting, enter, leave]
  );

  return <TopNoticeQueueContext.Provider value={queue}>{children}</TopNoticeQueueContext.Provider>;
}
