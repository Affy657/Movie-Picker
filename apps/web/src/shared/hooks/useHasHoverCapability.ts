import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

const QUERY = '(hover: hover) and (pointer: fine)';

export function useHasHoverCapability(): boolean {
  return useMediaQuery(QUERY);
}
