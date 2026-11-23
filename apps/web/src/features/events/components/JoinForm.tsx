import { useCallback, useId, type ReactNode } from 'react';
import clsx from 'clsx';
import { UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import type { JoinPromptCta } from '@/shared/analytics/usageCounts';
import { useTranslation } from '@/shared/i18n';
import { ROUTES } from '@/app/routes';
import { JOIN_PROMPT_ANCHOR_ID, useJoinPromptCount } from '@/features/events/joinPrompt';
import { useAnnounceJoined } from '@/features/events/joinedAnnouncement';
import { useJoinEvent } from '@/features/events/hooks/useJoinEvent';
import type { EventData } from '@/features/events/types';
import styles from './JoinForm.module.css';
import AccountChoiceLinks from '@/shared/components/AccountChoiceLinks';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface JoinFormProps {
  slug: string;
  event: Pick<EventData, 'title' | 'participants'>;
  onJoined: (participantId: string, pseudo: string) => void;

  isFull?: boolean;

  maxParticipants?: number | null;
}

function useInvitationLine(event: JoinFormProps['event']): string {
  const { t } = useTranslation();
  const hostName = event.participants?.find((participant) => participant.isCreator)?.pseudo;
  return hostName
    ? t('events.join.invitedBy', { name: hostName, title: event.title })
    : t('events.join.invited', { title: event.title });
}

export default function JoinForm({
  slug,
  event,
  onJoined,
  isFull,
  maxParticipants,
}: Readonly<JoinFormProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const join = useJoinEvent(slug);
  const announceJoined = useAnnounceJoined();
  const promptCount = useJoinPromptCount();
  const titleId = useId();
  const invitation = useInvitationLine(event);

  const joinAction = useCallback(async () => {
    const joined = await join();
    onJoined(joined.participantId, joined.pseudo);
    if (joined.isNew) announceJoined();
  }, [join, onJoined, announceJoined]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(joinAction, t('events.join.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

  const fullMessage =
    typeof maxParticipants === 'number' && maxParticipants > 0
      ? t('events.join.fullWithCap', { max: maxParticipants })
      : t('events.join.full');

  const trackPromptClick = (cta: JoinPromptCta) =>
    track('join_prompt_clicked', { cta }, { oncePerTab: `join_prompt_clicked:${slug}:${cta}` });

  const votePrompt = (
    <output className={styles.votePrompt}>
      {promptCount > 0 ? <span key={promptCount}>{t('events.join.votePrompt')}</span> : null}
    </output>
  );

  let body: ReactNode;
  if (isFull) {
    body = <p className={styles.intro}>{fullMessage}</p>;
  } else if (user) {
    body = (
      <>
        <p className={styles.invitation}>{invitation}</p>
        <p className={styles.intro}>{t('events.join.intro')}</p>
        {votePrompt}
        <form
          onSubmit={handleSubmit}
          className="form"
          aria-describedby={error ? 'join-error' : undefined}
        >
          {error && (
            <p id="join-error" className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className={styles.submit} loading={loading}>
            {loading ? t('events.join.submitting') : t('events.join.submit')}
          </Button>
        </form>
      </>
    );
  } else {
    body = (
      <>
        <p className={styles.invitation}>{invitation}</p>
        <p className={styles.intro}>{t('events.join.signedOutIntro')}</p>
        {votePrompt}
        <div className="nav-actions">
          <AccountChoiceLinks returnTo={ROUTES.eventDetailJoin(slug)} onChoose={trackPromptClick} />
        </div>
      </>
    );
  }

  return (
    <Card
      as="section"
      id={JOIN_PROMPT_ANCHOR_ID}
      aria-labelledby={titleId}
      padding="lg"
      elevation="sm"
      className={clsx(styles.root, promptCount > 0 && styles.prompted)}
    >
      {promptCount > 0 ? <span key={promptCount} className={styles.pulse} aria-hidden /> : null}
      <h2 className={styles.title} id={titleId}>
        {isFull ? (
          <Users size={ICON_SIZE.lg} aria-hidden className={styles.titleIcon} />
        ) : (
          <UserPlus size={ICON_SIZE.lg} aria-hidden className={styles.titleIcon} />
        )}
        <span className={styles.titleLabel}>
          {t(isFull ? 'events.join.fullTitle' : 'events.join.title')}
        </span>
      </h2>
      {body}
    </Card>
  );
}
