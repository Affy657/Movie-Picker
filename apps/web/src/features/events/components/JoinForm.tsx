import { useCallback, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { setStoredParticipant } from '@/features/events/storage';
import { useTranslation } from '@/shared/i18n';
import styles from './JoinForm.module.css';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;

  isFull?: boolean;

  maxParticipants?: number | null;
}

function pseudoForJoin(user: { displayName: string } | null, guestPseudo: string): string {
  if (user) {
    const fromAccount = user.displayName.trim();
    return fromAccount.length > 0 ? fromAccount : 'Participant';
  }
  return guestPseudo.trim();
}

export default function JoinForm({ slug, onJoined, isFull, maxParticipants }: JoinFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isGuest = !user;
  const [pseudo, setPseudo] = useState('');

  const joinAction = useCallback(async () => {
    const pseudoToSend = pseudoForJoin(user, pseudo);
    if (isGuest && !pseudoToSend) {
      throw new Error('Indique un pseudo pour rejoindre.');
    }
    const res = await joinEvent(slug, pseudoToSend);
    const { id } = res.participant;
    setStoredParticipant(slug, id, res.participant.pseudo);
    onJoined(id, res.participant.pseudo);
  }, [user, pseudo, isGuest, slug, onJoined]);

  const { run: submit, loading, error } = useAsyncAction(joinAction, 'Impossible de rejoindre');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const fullMessage =
    typeof maxParticipants === 'number' && maxParticipants > 0
      ? t('events.join.fullWithCap', { max: maxParticipants })
      : t('events.join.full');

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
      ) : (
        <>
          {isGuest ? (
            <p className={styles.intro}>Indique ton pseudo pour rejoindre la soirée.</p>
          ) : (
            <p className={styles.intro}>Rejoins la soirée pour proposer des films et voter.</p>
          )}
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
            {isGuest ? (
              <>
                <label className="label" htmlFor="join-pseudo">
                  Ton pseudo
                </label>
                <input
                  id="join-pseudo"
                  type="text"
                  className="input"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Ex : Alice"
                  autoComplete="nickname"
                  aria-invalid={error ? true : undefined}
                />
              </>
            ) : null}
            <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={loading}>
              {loading ? 'Envoi…' : 'Rejoindre'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
