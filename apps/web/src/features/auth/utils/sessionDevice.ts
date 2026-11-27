import type { LocaleCode } from '@/shared/i18n/locales';
import type { TranslationKey } from '@/shared/i18n';
import { formatRelativeTime } from '@/shared/utils/formatRelativeTime';
import type { ActiveSession } from '@/features/auth/types';

type Translate = (key: TranslationKey, params?: Record<string, string>) => string;

const DATE_LOCALE: Record<LocaleCode, string> = { fr: 'fr-FR', en: 'en-GB' };

export function sessionDeviceLabel(
  session: Pick<ActiveSession, 'browser' | 'operatingSystem'>,
  t: Translate
): string {
  const { browser, operatingSystem } = session;
  if (browser && operatingSystem) {
    return t('auth.account.activeSessionsDeviceLabel', { browser, os: operatingSystem });
  }
  return browser ?? operatingSystem ?? t('auth.account.activeSessionsUnknownDevice');
}

function formatSignInDate(iso: string, locale: LocaleCode): string {
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function sessionActivityLabel(
  session: Pick<ActiveSession, 'current' | 'lastActiveAt' | 'signedInAt'>,
  locale: LocaleCode,
  t: Translate
): string {
  if (session.current) return t('auth.account.activeSessionsActiveNow');
  const date = formatSignInDate(session.signedInAt, locale);
  if (!session.lastActiveAt) return t('auth.account.activeSessionsSignedInOn', { date });
  return t('auth.account.activeSessionsActiveAndSignedIn', {
    when: formatRelativeTime(session.lastActiveAt, locale),
    date,
  });
}
