import { useCallback, useState } from 'react';
import { joinEvent } from '@/features/events/api/eventsApi';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { setStoredParticipant } from '@/features/events/storage';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;
}

function pseudoForJoin(user: { displayName: string } | null, guestPseudo: string): string {
  if (user) {
    const fromAccount = user.displayName.trim();
    return fromAccount.length > 0 ? fromAccount : 'Participant';
  }
  return guestPseudo.trim();
}

export default function JoinForm({ slug, onJoined }: JoinFormProps) {
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

  return (
    <section className="section section-join">
      <h2>Rejoindre la soirée</h2>
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
              placeholder="Ex: Alice"
              autoComplete="nickname"
              aria-invalid={error ? true : undefined}
            />
          </>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Envoi…' : 'Rejoindre'}
        </button>
      </form>
    </section>
  );
}
