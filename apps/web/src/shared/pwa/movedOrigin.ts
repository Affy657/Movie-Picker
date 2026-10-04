import { safeLocalStorageGet, safeLocalStorageSet } from '@/shared/utils/safeStorage';

export const MOVED_ORIGIN_PARAM = 'movedFrom';
export const MOVED_ORIGIN_NOTICE_KEY = 'moviepicker_moved_origin_notice';
const LEGACY_ORIGIN_MARKER = 'web';

type MovedOriginLocation = Pick<Location, 'pathname' | 'search' | 'hash'>;

export function captureMovedOriginMarker(
  location: MovedOriginLocation,
  replaceUrl: (url: string) => void
): boolean {
  const params = new URLSearchParams(location.search);
  if (params.get(MOVED_ORIGIN_PARAM) !== LEGACY_ORIGIN_MARKER) return false;
  params.delete(MOVED_ORIGIN_PARAM);
  const search = params.toString();
  const query = search ? `?${search}` : '';
  replaceUrl(`${location.pathname}${query}${location.hash}`);
  if (safeLocalStorageGet(MOVED_ORIGIN_NOTICE_KEY) !== 'dismissed') {
    safeLocalStorageSet(MOVED_ORIGIN_NOTICE_KEY, 'pending');
  }
  return true;
}

export function isMovedOriginNoticePending(): boolean {
  return safeLocalStorageGet(MOVED_ORIGIN_NOTICE_KEY) === 'pending';
}

export function dismissMovedOriginNotice(): void {
  safeLocalStorageSet(MOVED_ORIGIN_NOTICE_KEY, 'dismissed');
}
