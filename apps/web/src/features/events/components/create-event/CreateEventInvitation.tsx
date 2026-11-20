import { Check, Copy, Link2, Plus, Share2 } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation } from '@/shared/i18n';
import EventCalendarMenu from '@/features/events/components/EventCalendarMenu';
import styles from './CreateEventDialog.module.css';

export type CreatedNightGroup = {
  name: string;
  memberCount: number;
  preview: ReadonlyArray<{ userId: string; displayName: string; avatarId: string }>;
};

export type CreatedNight = {
  slug: string;
  title: string;
  date: string;
  time: string;
  url: string;
  configNotSaved: boolean;
  group: CreatedNightGroup | null;
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
  const othersInGroup = night.group ? night.group.memberCount - 1 : 0;
  const toGroup = night.group !== null && othersInGroup > 0;

  const linkRow = (
    <div className={styles.linkRow}>
      <Link2 size={ICON_SIZE.md} aria-hidden className={styles.linkIcon} />
      <span className={styles.linkText}>{displayedUrl}</span>
      <Button size="sm" variant={toGroup ? 'secondary' : 'primary'} onClick={() => void copyLink()}>
        {copied ? (
          <Check size={ICON_SIZE.sm} aria-hidden />
        ) : (
          <Copy size={ICON_SIZE.sm} aria-hidden />
        )}
        {copied ? t('events.create.invitation.copied') : t('events.create.invitation.copy')}
      </Button>
    </div>
  );

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
        {toGroup && night.group ? (
          <div className={styles.groupNotice}>
            <AvatarStack
              people={night.group.preview.map((person) => ({
                key: person.userId,
                avatarId: person.avatarId,
                pseudo: person.displayName,
              }))}
              max={night.group.preview.length}
              size="sm"
            />
            <p className={styles.groupNoticeTitle}>
              {othersInGroup === 1
                ? t('events.create.invitation.groupSeesOne')
                : t('events.create.invitation.groupSees', { count: othersInGroup })}
            </p>
            <p className={styles.groupNoticeLead}>{t('events.create.invitation.groupLead')}</p>
          </div>
        ) : (
          <p className={styles.readyLead}>{t('events.create.invitation.lead')}</p>
        )}
        {night.configNotSaved ? (
          <output className={styles.configWarning}>{t('events.create.configNotSaved')}</output>
        ) : null}
        {toGroup ? null : linkRow}
        <div className={styles.inviteActionsFrame}>
          <div className={styles.inviteActions}>
            {canNativeShare && !toGroup ? (
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
              opensAboveRow
            />
            <Button className={styles.inviteAction} onClick={onPropose}>
              <Plus size={ICON_SIZE.md} aria-hidden />
              {t('events.create.invitation.propose')}
            </Button>
          </div>
        </div>
        {toGroup ? (
          <div className={styles.outsider}>
            <p className={styles.outsiderHint}>{t('events.create.invitation.outsider')}</p>
            {linkRow}
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
