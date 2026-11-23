import { useId } from 'react';
import { Check, Copy, Share2, UserPlus } from 'lucide-react';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation } from '@/shared/i18n';
import { eventFrontendUrl } from '@/features/events/api/eventsApi';
import styles from './EventInviteCard.module.css';

export default function EventInviteCard({
  slug,
  title,
}: Readonly<{ slug: string; title: string }>) {
  const { t } = useTranslation();
  const headingId = useId();
  const url = eventFrontendUrl(slug);
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    url,
    title,
    undefined,
    'event'
  );

  return (
    <Card as="section" surface="sunken" className={styles.card} aria-labelledby={headingId}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden>
          <UserPlus size={ICON_SIZE.lg} />
        </span>
        <div className={styles.text}>
          <h2 id={headingId} className={styles.title}>
            {t('events.inviteCard.title')}
          </h2>
          <p className={styles.lead}>{t('events.inviteCard.lead')}</p>
        </div>
      </div>
      <div className={styles.linkRow}>
        <span className={styles.link}>{url.replace(/^https?:\/\//, '')}</span>
        <div className={styles.actions}>
          <Button size="sm" variant="primary" onClick={() => void copyLink()}>
            {copied ? (
              <Check size={ICON_SIZE.sm} aria-hidden />
            ) : (
              <Copy size={ICON_SIZE.sm} aria-hidden />
            )}
            {copied ? t('events.create.invitation.copied') : t('events.create.invitation.copy')}
          </Button>
          {canNativeShare ? (
            <Button size="sm" onClick={() => void nativeShare()}>
              <Share2 size={ICON_SIZE.sm} aria-hidden />
              {t('events.create.invitation.share')}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
