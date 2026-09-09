import type { TranslationKey } from '@/shared/i18n';

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export interface MovieWheelExclusion {
  excluded: boolean;
  onToggle: () => void;
}
