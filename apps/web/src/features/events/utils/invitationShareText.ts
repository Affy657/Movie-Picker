import type { Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { formatEventTitleDate } from '@/shared/utils/formatMyEventsListDate';

export function invitationShareText(
  t: Translate,
  locale: LocaleCode,
  event: Readonly<{ title: string; date: string }>,
  date: string,
  time: string
): string {
  const suggestedTitle = t('events.create.defaultTitle', {
    date: formatEventTitleDate(event.date, locale),
  });
  return event.title.trim() === suggestedTitle
    ? t('events.share.shareTextDefaultTitle', { date, time })
    : t('events.share.shareText', { title: event.title, date, time });
}
