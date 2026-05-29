import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { setStoredParticipant } from '@/features/events/storage';
import { useTranslation } from '@/shared/i18n';
import { ROUTES, withReturnTo } from '@/app/routes';
import styles from './JoinForm.module.css';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;

  isFull?: boolean;

  maxParticipants?: number | null;
}

export default function JoinForm({ slug, onJoined, isFull, maxParticipants }: JoinFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const joinAction = useCallback(async () => {
    const pseudoToSend = user?.displayName.trim() || 'Participant';
    const res = await joinEvent(slug, pseudoToSend);
    const { id } = res.participant;
    setStoredParticipant(slug, id, res.participant.pseudo);
    onJoined(id, res.participant.pseudo);
  }, [user, slug, onJoined]);

  const { run: submit, loading, error } = useAsyncAction(joinAction, 'Impossible de rejoindre');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const fullMessage =
    typeof maxParticipants === 'number' && maxParticipants > 0
      ? t('events.join.fullWithCap', { max: maxParticipants })
      : t('events.join.full');

  const returnTo = ROUTES.eventDetail(slug);

  return (
    <section className={styles.root}>
      <h2 className={styles.title}>
        <UserPlus size={18} aria-hidden className={styles.titleIcon} />
        Rejoindre la soirée
      </h2>
      {isFull ? (
        <p className={styles.fullMessage} role="status" aria-live="polite">
          {fullMessage}
        </p>
      ) : !user ? (
        <>
          <p className={styles.intro}>Connecte-toi ou crée un compte pour rejoindre la soirée.</p>
          <nav className="nav-actions">
            <Link to={withReturnTo(ROUTES.login, returnTo)} className="btn btn-primary">
              Se connecter
            </Link>
            <Link to={withReturnTo(ROUTES.register, returnTo)} className="btn">
              Créer un compte
            </Link>
          </nav>
        </>
      ) : (
        <>
          <p className={styles.intro}>Rejoins la soirée pour proposer des films et voter.</p>
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
            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
              {loading ? 'Envoi…' : 'Rejoindre'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
