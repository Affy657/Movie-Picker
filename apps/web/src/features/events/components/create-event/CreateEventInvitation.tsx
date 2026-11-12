import { Check, Copy, Link2, Plus, Share2 } from 'lucide-react';
import Button from '@/shared/components/Button';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation } from '@/shared/i18n';
import EventCalendarMenu from '@/features/events/components/EventCalendarMenu';
import styles from './CreateEventDialog.module.css';

export type CreatedNight = {
  slug: string;
  title: string;
  date: string;
  time: string;
  url: string;
  configNotSaved: boolean;
};

type CreateEventInvitationProps = {
  open: boolean;
  onClose: () => void;
  night: CreatedNight;
  onOpen: () => void;
  onPropose: () => void;
};

export default function CreateEventInvitation({
  open,
  onClose,
  night,
  onOpen,
  onPropose,
}: Readonly<CreateEventInvitationProps>) {
  const { t } = useTranslation();
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    night.url,
    night.title,
    undefined,
    'event'
  );
  const displayedUrl = night.url.replace(/^https?:\/\//, '');

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      title={t('events.create.invitation.title')}
      footer={
        <div className={styles.footer}>
          <p className={styles.footerHint}>{t('events.create.invitation.linkStays')}</p>
          <Button variant="primary" onClick={onOpen}>
            {t('events.create.invitation.open')}
          </Button>
        </div>
      }
    >
      <div className={styles.invitation}>
        <span className={styles.readyMark} aria-hidden>
          <Check size={ICON_SIZE.lg} />
        </span>
        <p className={styles.readyTitle}>
          {t('events.create.invitation.ready', { title: night.title })}
        </p>
        <p className={styles.readyLead}>{t('events.create.invitation.lead')}</p>
        {night.configNotSaved ? (
          <p className={styles.configWarning} role="status">
            {t('events.create.configNotSaved')}
          </p>
        ) : null}
        <div className={styles.linkRow}>
          <Link2 size={ICON_SIZE.md} aria-hidden className={styles.linkIcon} />
          <span className={styles.linkText}>{displayedUrl}</span>
          <Button size="sm" variant="primary" onClick={() => void copyLink()}>
            {copied ? (
              <Check size={ICON_SIZE.sm} aria-hidden />
            ) : (
              <Copy size={ICON_SIZE.sm} aria-hidden />
            )}
            {copied ? t('events.create.invitation.copied') : t('events.create.invitation.copy')}
          </Button>
        </div>
        <div className={styles.inviteActions}>
          {canNativeShare ? (
            <Button className={styles.inviteAction} onClick={() => void nativeShare()}>
              <Share2 size={ICON_SIZE.md} aria-hidden />
              {t('events.create.invitation.share')}
            </Button>
          ) : null}
          <EventCalendarMenu
            title={night.title}
            date={night.date}
            time={night.time}
            url={night.url}
            triggerLabel={t('events.create.invitation.calendar')}
            triggerClassName={styles.inviteAction}
          />
          <Button className={styles.inviteAction} onClick={onPropose}>
            <Plus size={ICON_SIZE.md} aria-hidden />
            {t('events.create.invitation.propose')}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
