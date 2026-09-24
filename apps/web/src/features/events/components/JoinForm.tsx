import { useCallback, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import { JOIN_PROMPT_ANCHOR_ID } from '@/features/events/joinPrompt';
import styles from './JoinForm.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;

  isFull?: boolean;

  maxParticipants?: number | null;
}

export default function JoinForm({
  slug,
  onJoined,
  isFull,
  maxParticipants,
}: Readonly<JoinFormProps>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const queryClient = useQueryClient();

  const joinAction = useCallback(async () => {
    const pseudoToSend = user?.displayName.trim() || 'Participant';
    const res = await joinEvent(slug, pseudoToSend);
    const { id } = res.participant;
    setStoredParticipant(slug, id, res.participant.pseudo);
    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    track('event_joined');
    onJoined(id, res.participant.pseudo);
  }, [user, slug, onJoined, track, queryClient]);

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

  const returnTo = ROUTES.eventDetail(slug);

  let body: ReactNode;
  if (isFull) {
    body = <p className={styles.intro}>{fullMessage}</p>;
  } else if (user) {
    body = (
      <>
        <p className={styles.intro}>{t('events.join.intro')}</p>
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
        <p className={styles.intro}>{t('events.join.signedOutIntro')}</p>
        <nav className="nav-actions">
          <Link
            to={withReturnTo(ROUTES.login, returnTo)}
            className={buttonClass({ variant: 'primary' })}
          >
            {t('home.ctaLogin')}
          </Link>
          <Link to={withReturnTo(ROUTES.register, returnTo)} className={buttonClass()}>
            {t('home.ctaRegister')}
          </Link>
        </nav>
      </>
    );
  }

  return (
    <Card
      as="section"
      id={JOIN_PROMPT_ANCHOR_ID}
      padding="lg"
      elevation="sm"
      className={styles.root}
    >
      <h2 className={styles.title}>
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
