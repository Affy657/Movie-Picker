import { useCallback } from 'react';
import { useAnalytics, type AnalyticsEvent } from '@/shared/hooks/useAnalytics';
import { useCopyFeedback } from '@/shared/hooks/useCopyFeedback';

type ShareSurface = 'event' | 'profile';

const LINK_SHARED: AnalyticsEvent = 'link_shared';

export function useShareAction(
  url: string,
  shareTitle: string,
  shareText: string | undefined,
  surface: ShareSurface
) {
  const { track } = useAnalytics();
  const { copied, copy } = useCopyFeedback();
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copyLink = useCallback(async () => {
    const ok = await copy(url);
    if (ok) track(LINK_SHARED, { method: 'clipboard', surface });
  }, [copy, url, track, surface]);

  const nativeShare = useCallback(async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: shareTitle, url, text: shareText });
        track(LINK_SHARED, { method: 'native', surface });
        return;
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === 'AbortError') return;
      }
    }
    await copyLink();
  }, [canNativeShare, shareTitle, url, shareText, track, surface, copyLink]);

  return { copied, copyLink, nativeShare, canNativeShare };
}
