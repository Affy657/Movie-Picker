import { useCallback, useId, useRef, useState } from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useMenuFocus } from '@/shared/hooks/useMenuFocus';
import { useMenuHorizontalFit } from '@/shared/hooks/useMenuHorizontalFit';
import { useTranslation } from '@/shared/i18n';
import {
  buildIcsContent,
  calendarFileName,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/shared/utils/icsCalendar';
import styles from './MenuPanel.module.css';
import Button from '@/shared/components/Button';

type EventCalendarMenuProps = {
  title: string;
  date: string;
  time: string;
  url?: string;
};

export default function EventCalendarMenu({
  title,
  date,
  time,
  url,
}: Readonly<EventCalendarMenuProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(containerRef, close, open);
  useMenuFocus(open, panelRef, triggerRef);
  const fitLeft = useMenuHorizontalFit(open, containerRef, panelRef);

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
    if (!content || typeof URL.createObjectURL !== 'function') return;
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = calendarFileName(calendarEvent);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    close();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <Button
        ref={triggerRef}
        type="button"
        className={styles.iconTrigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('events.calendar.addButton')}
        title={t('events.calendar.addButton')}
      >
        <CalendarPlus size={16} aria-hidden />
      </Button>

      {open ? (
        <div
          ref={panelRef}
          id={menuId}
          className={styles.dropdown}
          role="menu"
          tabIndex={-1}
          aria-label={t('events.calendar.menuLabel')}
          style={fitLeft !== null ? { left: fitLeft, right: 'auto' } : undefined}
        >
          <a
            className={styles.item}
            role="menuitem"
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            <ExternalLink className={styles.icon} size={15} aria-hidden />
            <span className={styles.itemLabel}>{t('events.calendar.google')}</span>
          </a>
          <a
            className={styles.item}
            role="menuitem"
            href={outlookHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            <ExternalLink className={styles.icon} size={15} aria-hidden />
            <span className={styles.itemLabel}>{t('events.calendar.outlook')}</span>
          </a>
          <button type="button" role="menuitem" className={styles.item} onClick={handleDownloadIcs}>
            <Download className={styles.icon} size={15} aria-hidden />
            <span className={styles.itemLabel}>{t('events.calendar.apple')}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
