import { useCallback, useEffect, useState } from 'react';
import { copyTextToClipboard } from '@/shared/utils/copyTextToClipboard';

const DEFAULT_FEEDBACK_MS = 2000;

export function useCopyFeedback(feedbackMs = DEFAULT_FEEDBACK_MS) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = globalThis.setTimeout(() => setCopied(false), feedbackMs);
    return () => globalThis.clearTimeout(id);
  }, [copied, feedbackMs]);

  const copy = useCallback((text: string) => {
    void copyTextToClipboard(text).then((ok) => {
      if (ok) setCopied(true);
    });
  }, []);

  return { copied, copy };
}
