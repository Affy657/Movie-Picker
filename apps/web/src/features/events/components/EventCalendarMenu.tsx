import type { ReactNode } from 'react';
import clsx from 'clsx';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';
import { MenuItem, MenuPanel } from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation } from '@/shared/i18n';
import {
  buildIcsContent,
  calendarFileName,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/shared/utils/icsCalendar';
import { downloadBlob } from '@/shared/utils/downloadBlob';
import styles from './EventCalendarMenu.module.css';

type EventCalendarMenuProps = {
  title: string;
  date: string;
  time: string;
  url?: string;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerVariant?: 'secondary' | 'ghost';
  triggerTrailing?: ReactNode;
  className?: string;
};

export default function EventCalendarMenu({
  title,
  date,
  time,
  url,
  triggerLabel,
  triggerClassName,
  triggerVariant = 'secondary',
  triggerTrailing,
  className,
}: Readonly<EventCalendarMenuProps>) {
  const { t } = useTranslation();
  const menu = useMenuState({ placement: 'auto' });

  const calendarEvent: CalendarEvent = {
    title,
    date,
    time,
    url,
    description: url
      ? t('events.calendar.icsDescription', { url })
      : t('events.calendar.icsDescriptionNoUrl'),
  };

  const googleHref = googleCalendarUrl(calendarEvent);
  const outlookHref = outlookCalendarUrl(calendarEvent);
  if (!googleHref || !outlookHref) return null;

  const handleDownloadIcs = () => {
    const content = buildIcsContent(calendarEvent);
    if (!content) return;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    if (!downloadBlob(blob, calendarFileName(calendarEvent))) return;
    menu.close();
  };

  const externalIcon = <ExternalLink size={ICON_SIZE.md} aria-hidden />;

  return (
    <div className={clsx(styles.container, className)} ref={menu.containerRef}>
      {triggerLabel ? (
        <Button
          {...menu.triggerProps}
          variant={menu.open ? 'soft' : triggerVariant}
          className={triggerClassName}
        >
          <CalendarPlus size={ICON_SIZE.md} aria-hidden />
          {triggerLabel}
          {triggerTrailing}
        </Button>
      ) : (
        <IconButton {...menu.triggerProps} size="lg" ariaLabel={t('events.calendar.addButton')}>
          <CalendarPlus size={ICON_SIZE.md} aria-hidden />
        </IconButton>
      )}

      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={t('events.calendar.menuLabel')}>
          <MenuItem href={googleHref} external icon={externalIcon} onClick={menu.close}>
            {t('events.calendar.google')}
          </MenuItem>
          <MenuItem href={outlookHref} external icon={externalIcon} onClick={menu.close}>
            {t('events.calendar.outlook')}
          </MenuItem>
          <MenuItem icon={<Download size={ICON_SIZE.md} aria-hidden />} onClick={handleDownloadIcs}>
            {t('events.calendar.apple')}
          </MenuItem>
        </MenuPanel>
      ) : null}
    </div>
  );
}
