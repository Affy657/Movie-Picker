import { useRef, useState } from 'react';
import clsx from 'clsx';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { useClickOutside } from '@/shared/hooks/useClickOutside';
import { useTranslation } from '@/shared/i18n';
import {
  buildIcsContent,
  calendarFileName,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/shared/utils/icsCalendar';
import styles from './AddToCalendarButton.module.css';

interface AddToCalendarButtonProps {
  title: string;
  date: string;
  time: string;
  url?: string;
}

export default function AddToCalendarButton({
  title,
  date,
  time,
  url,
}: Readonly<AddToCalendarButtonProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useClickOutside(rootRef, () => setOpen(false), open);

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
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={clsx('btn', styles.trigger)}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('events.calendar.addButton')}
        title={t('events.calendar.addButton')}
      >
        <CalendarPlus size={16} aria-hidden />
      </button>
      {open ? (
        <div className={styles.menu} role="menu" aria-label={t('events.calendar.menuLabel')}>
          <a
            role="menuitem"
            className={styles.item}
            href={googleHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <ExternalLink size={14} aria-hidden />
            <span>{t('events.calendar.google')}</span>
          </a>
          <a
            role="menuitem"
            className={styles.item}
            href={outlookHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <ExternalLink size={14} aria-hidden />
            <span>{t('events.calendar.outlook')}</span>
          </a>
          <button type="button" role="menuitem" className={styles.item} onClick={handleDownloadIcs}>
            <Download size={14} aria-hidden />
            <span>{t('events.calendar.apple')}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
