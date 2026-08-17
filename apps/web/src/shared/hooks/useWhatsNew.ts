import { useCallback, useEffect, useRef, useState } from 'react';
import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';
import { LATEST_WHATS_NEW_RELEASE, type WhatsNewRelease } from '@/shared/whatsNew';

function storageKey(userId: string) {
  return `moviepicker_whats_new_seen_${userId}`;
}

function readSeenVersion(userId: string): string | null {
  return safeLocalStorageGet(storageKey(userId));
}

function writeSeenVersion(userId: string, version: string): void {
  safeLocalStorageSet(storageKey(userId), version);
}

export type UseWhatsNewResult = {
  isOpen: boolean;
  release: WhatsNewRelease;
  openOnDemand: () => void;
  close: () => void;
};

export function useWhatsNew(userId: string | undefined): UseWhatsNewResult {
  const dismissedRef = useRef(false);

  const computeIsOpen = useCallback((id: string | undefined) => {
    if (dismissedRef.current) return false;
    return !!id && readSeenVersion(id) !== LATEST_WHATS_NEW_RELEASE.version;
  }, []);

  const [isOpen, setIsOpen] = useState(() => computeIsOpen(userId));

  useEffect(() => {
    setIsOpen(computeIsOpen(userId));
  }, [userId, computeIsOpen]);

  const openOnDemand = useCallback(() => {
    dismissedRef.current = false;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    dismissedRef.current = true;
    if (userId) writeSeenVersion(userId, LATEST_WHATS_NEW_RELEASE.version);
  }, [userId]);

  return { isOpen, release: LATEST_WHATS_NEW_RELEASE, openOnDemand, close };
}
