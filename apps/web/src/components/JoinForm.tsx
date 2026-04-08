import { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import { ApiError } from '../api/apiError';
import { useAuth } from '../contexts/AuthContext';
import type { ParticipantData } from '../types/event';
import { setStoredParticipant } from '../types/event';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;
}

export default function JoinForm({ slug, onJoined }: JoinFormProps) {
  const { user } = useAuth();
  const [pseudo, setPseudo] = useState('');
  const [pseudoTouched, setPseudoTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pseudoTouched) return;
    if (user?.displayName) setPseudo(user.displayName);
  }, [user?.displayName, pseudoTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchApi<
        ParticipantData | { participant: ParticipantData; message: string }
      >(`/events/${slug}/join`, {
        method: 'POST',
        body: JSON.stringify({ pseudo: pseudo.trim() }),
      });
      const participant = 'participant' in res ? res.participant : res;
      const id = participant._id;
      setStoredParticipant(slug, id, participant.pseudo);
      onJoined(id, participant.pseudo);
    } catch (err) {
      const msg = ApiError.is(err) ? err.message : err instanceof Error ? err.message : 'Erreur';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
        <label className="label" htmlFor="join-pseudo">
          Ton pseudo
        </label>
        <input
          id="join-pseudo"
          type="text"
          className="input"
          value={pseudo}
          onChange={(e) => {
            setPseudoTouched(true);
            setPseudo(e.target.value);
          }}
          required
          maxLength={100}
          placeholder="Ex: Alice"
          autoComplete="nickname"
          aria-invalid={error ? true : undefined}
        />
        {user ? (
          <p className="hint">
            Prérempli depuis votre compte — vous pouvez le modifier pour cette soirée.
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Envoi…' : 'Rejoindre'}
        </button>
      </form>
    </section>
  );
}
