import { useCallback, useEffect, useState } from 'react';
import { LATEST_WHATS_NEW_RELEASE, type WhatsNewRelease } from '@/shared/whatsNew';

function storageKey(userId: string) {
  return `moviepicker_whats_new_seen_${userId}`;
}

function readSeenVersion(userId: string): string | null {
  try {
    return localStorage.getItem(storageKey(userId));
  } catch {
    return null;
  }
}

function writeSeenVersion(userId: string, version: string) {
  try {
    localStorage.setItem(storageKey(userId), version);
  } catch {
    return;
  }
}

export type UseWhatsNewResult = {
  isOpen: boolean;
  release: WhatsNewRelease;
  openOnDemand: () => void;
  close: () => void;
};

export function useWhatsNew(userId: string | undefined): UseWhatsNewResult {
  const [isOpen, setIsOpen] = useState(
    () => !!userId && readSeenVersion(userId) !== LATEST_WHATS_NEW_RELEASE.version
  );

  useEffect(() => {
    setIsOpen(!!userId && readSeenVersion(userId) !== LATEST_WHATS_NEW_RELEASE.version);
  }, [userId]);

  const openOnDemand = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    if (userId) writeSeenVersion(userId, LATEST_WHATS_NEW_RELEASE.version);
  }, [userId]);

  return { isOpen, release: LATEST_WHATS_NEW_RELEASE, openOnDemand, close };
}
