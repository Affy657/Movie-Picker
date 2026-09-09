import { useCallback, type ReactNode } from 'react';
import { Link } from 'react-router';
import { UserPlus } from 'lucide-react';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { setStoredParticipant } from '@/features/events/storage';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import styles from './JoinForm.module.css';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';

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

  const joinAction = useCallback(async () => {
    const pseudoToSend = user?.displayName.trim() || 'Participant';
    const res = await joinEvent(slug, pseudoToSend);
    const { id } = res.participant;
    setStoredParticipant(slug, id, res.participant.pseudo);
    track('event_joined');
    onJoined(id, res.participant.pseudo);
  }, [user, slug, onJoined, track]);

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
    body = (
      <p className={styles.fullMessage} role="status" aria-live="polite">
        {fullMessage}
      </p>
    );
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
          <Button type="submit" variant="primary" className={styles.submit} disabled={loading}>
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
    <Card as="section" padding="lg" elevation="sm" className={styles.root}>
      <h2 className={styles.title}>
        <UserPlus size={18} aria-hidden className={styles.titleIcon} />
        <span className={styles.titleLabel}>{t('events.join.title')}</span>
      </h2>
      {body}
    </Card>
  );
}
