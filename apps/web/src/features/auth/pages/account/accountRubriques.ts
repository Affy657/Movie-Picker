import { Bell, Link2, Shield, Sliders, User } from 'lucide-react';
import type { ComponentType } from 'react';
import { ROUTES } from '@/app/routes';
import type { TranslationKey } from '@/shared/i18n';

export interface AccountRubrique {
  key: 'profil' | 'preferences' | 'notifications' | 'integrations' | 'securite';
  to: string;
  icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean; className?: string }>;
  labelKey: TranslationKey;
  summaryKey: TranslationKey;
}

export const ACCOUNT_RUBRIQUES: readonly AccountRubrique[] = [
  {
    key: 'profil',
    to: ROUTES.accountProfile,
    icon: User,
    labelKey: 'auth.account.profileTitle',
    summaryKey: 'auth.account.navSummaryProfile',
  },
  {
    key: 'preferences',
    to: ROUTES.accountPreferences,
    icon: Sliders,
    labelKey: 'auth.account.preferencesTitle',
    summaryKey: 'auth.account.navSummaryPreferences',
  },
  {
    key: 'notifications',
    to: ROUTES.accountNotifications,
    icon: Bell,
    labelKey: 'notifications.title',
    summaryKey: 'auth.account.navSummaryNotifications',
  },
  {
    key: 'integrations',
    to: ROUTES.accountIntegrations,
    icon: Link2,
    labelKey: 'auth.account.integrationsTitle',
    summaryKey: 'auth.account.navSummaryIntegrations',
  },
  {
    key: 'securite',
    to: ROUTES.accountSecurity,
    icon: Shield,
    labelKey: 'auth.account.securityTitle',
    summaryKey: 'auth.account.navSummarySecurity',
  },
] as const;
