import { useState } from 'react';
import { fetchApi } from '../api/client';
import type { ParticipantData } from '../types/event';
import { setStoredParticipant } from '../types/event';

interface JoinFormProps {
  slug: string;
  onJoined: (participantId: string, pseudo: string) => void;
}

export default function JoinForm({ slug, onJoined }: JoinFormProps) {
  const [pseudo, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchApi<ParticipantData | { participant: ParticipantData; message: string }>(
        `/events/${slug}/join`,
        { method: 'POST', body: JSON.stringify({ pseudo: pseudo.trim() }) }
      );
      const participant = 'participant' in res ? res.participant : res;
      const id = participant._id;
      setStoredParticipant(slug, id, participant.pseudo);
      onJoined(id, participant.pseudo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section section-join">
      <h2>Rejoindre la soirée</h2>
      <form onSubmit={handleSubmit} className="form">
        {error && <p className="error">{error}</p>}
        <label className="label">
          Ton pseudo
          <input
            type="text"
            className="input"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            required
            maxLength={100}
            placeholder="Ex: Alice"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Envoi…' : 'Rejoindre'}
        </button>
      </form>
    </section>
  );
}
