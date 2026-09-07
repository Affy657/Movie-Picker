import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

const QUERY = '(max-width: 767px)';

export function useIsMobile(): boolean {
  return useMediaQuery(QUERY);
}
