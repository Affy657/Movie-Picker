import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import ShareLink from '@/features/events/components/ShareLink';
import EventThemeBanner from '@/features/events/components/EventThemeBanner';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import styles from './EventDetailHeader.module.css';

export type EventDetailHeaderProps = {
  title: string;
  dateFormatted: string;
  isFinished: boolean;
  /** Thème affiché sous le bouton retour (bandeau). */
  eventTheme: string | null | undefined;
  /** URL publique à partager avec les invités (QR + copier). */
  shareUrl: string;
};

export default function EventDetailHeader({
  title,
  dateFormatted,
  isFinished,
  eventTheme,
  shareUrl,
}: EventDetailHeaderProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className={styles.root}>
      <div className={styles.top}>
        <button
          type="button"
          className="back-link back-link-button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate(ROUTES.home);
            }
          }}
        >
          <ArrowLeft size={16} aria-hidden />
          {t('events.detail.backNav')}
        </button>
      </div>
      <EventThemeBanner theme={eventTheme} />
      <div className={styles.intro}>
        <h1>{title}</h1>
        <div className={styles.metaRow}>
          <p className={styles.meta}>{dateFormatted}</p>
          {isFinished && (
            <span className={styles.badgeFinished}>
              <CheckCircle2 size={12} aria-hidden />
              {t('events.detail.finishedBanner')}
            </span>
          )}
        </div>
        {shareUrl ? (
          <div className={styles.share}>
            <ShareLink url={shareUrl} showQr />
          </div>
        ) : null}
      </div>
    </header>
  );
}
