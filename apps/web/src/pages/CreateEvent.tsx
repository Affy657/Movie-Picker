import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { pageTitle, useDocumentTitle } from '../hooks/useDocumentTitle';
import { queryKeys } from '../hooks/queryKeys';
import { setStoredParticipant } from '../types/event';

interface CreatorParticipant {
  _id: string;
  pseudo: string;
}

interface CreateResponse {
  slug: string;
  shareUrl: string;
  creatorParticipant?: CreatorParticipant;
}

const isDev = import.meta.env.DEV;

function getDefaultDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function CreateEvent() {
  useDocumentTitle(pageTitle('Nouvelle soirée'));

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(isDev ? 'Soirée test' : '');
  const [date, setDate] = useState(isDev ? getDefaultDate() : '');
  const [time, setTime] = useState(isDev ? '20:00' : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchApi<CreateResponse>('/events', {
        method: 'POST',
        body: JSON.stringify({ title, date, time }),
      });
      const publicUrl = `${window.location.origin}/s/${res.slug}`;
      if (res.creatorParticipant) {
        setStoredParticipant(res.slug, res.creatorParticipant._id, res.creatorParticipant.pseudo);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
      navigate(`/s/${res.slug}`, {
        state: { shareUrl: publicUrl, justCreated: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Link to="/" className="back-link">
        ← Accueil
      </Link>
      <h1>Créer une soirée</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <p className="error">{error}</p>}
        <label className="label">
          Titre
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Ex: Soirée film du vendredi"
          />
        </label>
        <label className="label">
          Date
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="label">
          Heure
          <input
            type="time"
            className="input"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Création…' : 'Créer la soirée'}
        </button>
      </form>
    </main>
  );
}
