import { useCallback, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../api/client';
import { ApiError } from '../api/apiError';
import { queryKeys } from '../hooks/queryKeys';
import {
  REACTION_CATALOG_IDS,
  REACTION_LABELS,
  type ReactionCatalogId,
} from '../constants/reactionCatalog';
import {
  datetimeLocalToEndDatePayload,
  isoToDatetimeLocalValue,
} from '../utils/eventDateTimeLocal';
import type { EventConfigData, EventData, WheelMode } from '../types/event';
import { DEFAULT_EVENT_CONFIG } from '../types/event';

type HostEventSettingsPanelProps = {
  slug: string;
  hostToken: string | null;
  event: EventData;
};

function normalizeConfig(c: EventConfigData | undefined): EventConfigData {
  return {
    theme: c?.theme ?? DEFAULT_EVENT_CONFIG.theme,
    endDate: c?.endDate ?? DEFAULT_EVENT_CONFIG.endDate,
    maxProposalsPerParticipant:
      c?.maxProposalsPerParticipant ?? DEFAULT_EVENT_CONFIG.maxProposalsPerParticipant,
    wheelMode: c?.wheelMode ?? DEFAULT_EVENT_CONFIG.wheelMode,
    allowedReactionIds: c?.allowedReactionIds ?? DEFAULT_EVENT_CONFIG.allowedReactionIds,
    richSharePreview: c?.richSharePreview ?? DEFAULT_EVENT_CONFIG.richSharePreview,
  };
}

function allowedToSelectedSet(allowed: string[] | null | undefined): Set<ReactionCatalogId> {
  if (allowed == null) {
    return new Set(REACTION_CATALOG_IDS);
  }
  const next = new Set<ReactionCatalogId>();
  for (const id of allowed) {
    if (REACTION_CATALOG_IDS.includes(id as ReactionCatalogId)) {
      next.add(id as ReactionCatalogId);
    }
  }
  return next;
}

export default function HostEventSettingsPanel({
  slug,
  hostToken,
  event,
}: HostEventSettingsPanelProps) {
  const queryClient = useQueryClient();
  const cfg = normalizeConfig(event.config);
  const locked = !!event.terminé || !!event.winnerMovie;

  const [theme, setTheme] = useState(cfg.theme ?? '');
  const [endLocal, setEndLocal] = useState(isoToDatetimeLocalValue(cfg.endDate));
  const [maxProp, setMaxProp] = useState<string>(
    cfg.maxProposalsPerParticipant != null ? String(cfg.maxProposalsPerParticipant) : ''
  );
  const [wheelMode, setWheelMode] = useState<WheelMode>(cfg.wheelMode);
  const [reactionSel, setReactionSel] = useState<Set<ReactionCatalogId>>(() =>
    allowedToSelectedSet(cfg.allowedReactionIds)
  );
  const [richSharePreview, setRichSharePreview] = useState(() => !!cfg.richSharePreview);
  const [flashOk, setFlashOk] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hydrateFromEvent = useCallback(() => {
    const next = normalizeConfig(event.config);
    setTheme(next.theme ?? '');
    setEndLocal(isoToDatetimeLocalValue(next.endDate));
    setMaxProp(
      next.maxProposalsPerParticipant != null ? String(next.maxProposalsPerParticipant) : ''
    );
    setWheelMode(next.wheelMode);
    setReactionSel(allowedToSelectedSet(next.allowedReactionIds));
    setRichSharePreview(!!next.richSharePreview);
    setFormError(null);
  }, [event.config]);

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const q = hostToken ? `?host=${encodeURIComponent(hostToken)}` : '';
      return fetchApi<EventConfigData>(`/events/${slug}/config${q}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      setFlashOk(true);
      window.setTimeout(() => setFlashOk(false), 4000);
    },
    onError: (e) => {
      setFormError(ApiError.is(e) ? e.message : e instanceof Error ? e.message : 'Erreur');
    },
  });

  const toggleReaction = (id: ReactionCatalogId) => {
    setReactionSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const endPayload = datetimeLocalToEndDatePayload(endLocal);
    if (endLocal.trim() && !endPayload) {
      setFormError('Date de fin invalide.');
      return;
    }

    let maxProposalsPerParticipant = 0;
    if (maxProp.trim() !== '') {
      const n = Number(maxProp);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        setFormError(
          'Limite de propositions : nombre entier entre 1 et 100, ou vide pour illimité.'
        );
        return;
      }
      maxProposalsPerParticipant = n;
    }

    const allowedReactionIds =
      reactionSel.size === 0
        ? []
        : reactionSel.size === REACTION_CATALOG_IDS.length
          ? [...REACTION_CATALOG_IDS]
          : REACTION_CATALOG_IDS.filter((id) => reactionSel.has(id));

    mutation.mutate({
      theme: theme.trim(),
      endDate: endPayload,
      maxProposalsPerParticipant,
      wheelMode,
      allowedReactionIds,
      richSharePreview,
    });
  };

  return (
    <details
      className="host-event-settings"
      onToggle={(ev) => {
        const el = ev.currentTarget;
        if (el.open) hydrateFromEvent();
      }}
    >
      <summary className="host-event-settings-summary">Paramètres de la soirée</summary>
      <p className="host-event-settings-lead">
        Réservé à l&apos;hôte — thème, fin de validité, limite de propositions, mode de roue et
        réactions proposées.
      </p>
      {locked && (
        <p className="host-event-settings-locked">
          Cette soirée n&apos;est plus modifiable (terminée ou roue déjà lancée).
        </p>
      )}
      {flashOk && <p className="success-banner">Paramètres enregistrés.</p>}
      {formError && <p className="error">{formError}</p>}
      <form className="form host-event-settings-form" onSubmit={onSubmit}>
        <div className="host-field">
          <label className="label" htmlFor="host-cfg-theme">
            Thème / ambiance
          </label>
          <input
            id="host-cfg-theme"
            className="input"
            type="text"
            autoComplete="off"
            placeholder="ex. Horreur, Comédie…"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={locked || mutation.isPending}
          />
          <p className="hint">Visible par tous sous forme de bandeau sur cette page.</p>
        </div>

        <div className="host-field">
          <label className="label" htmlFor="host-cfg-end">
            Fin de validité (optionnel)
          </label>
          <input
            id="host-cfg-end"
            className="input"
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
            disabled={locked || mutation.isPending}
          />
          <p className="hint">
            Vide = date de fin personnalisée effacée (logique par défaut côté API).
          </p>
        </div>

        <div className="host-field">
          <label className="label" htmlFor="host-cfg-max">
            Limite de films proposés par participant
          </label>
          <input
            id="host-cfg-max"
            className="input"
            type="number"
            min={1}
            max={100}
            step={1}
            placeholder="Illimité"
            value={maxProp}
            onChange={(e) => setMaxProp(e.target.value)}
            disabled={locked || mutation.isPending}
          />
          <p className="hint">Laisser vide pour aucune limite.</p>
        </div>

        <div className="host-field">
          <label className="label" htmlFor="host-cfg-wheel">
            Mode de la roue
          </label>
          <select
            id="host-cfg-wheel"
            className="input host-select"
            value={wheelMode}
            onChange={(e) => setWheelMode(e.target.value as WheelMode)}
            disabled={locked || mutation.isPending}
          >
            <option value="strictRandom">Aléatoire strict (égalité)</option>
            <option value="weightedByVotes">Pondéré par les votes</option>
          </select>
        </div>

        <div className="host-field">
          <label className="label reaction-check-label">
            <input
              id="host-cfg-rich-share"
              type="checkbox"
              checked={richSharePreview}
              onChange={(e) => setRichSharePreview(e.target.checked)}
              disabled={locked || mutation.isPending}
            />{' '}
            Aperçu de lien détaillé (messageries / réseaux)
          </label>
          <p className="hint">
            Désactivé par défaut : le titre et les détails de la soirée ne sont pas exposés dans
            l’aperçu du lien. Si vous cochez, activez aussi le branchement CloudFront décrit dans la
            doc déploiement (MP-17), sinon le partage reste générique côté URL <code>/s/…</code>.
          </p>
        </div>

        <fieldset
          className="host-field fieldset-reactions host-fieldset"
          disabled={locked || mutation.isPending}
        >
          <legend className="label">Réactions autorisées</legend>
          <p className="hint fieldset-hint">Toutes cochées équivaut au catalogue complet.</p>
          <ul className="reaction-checklist">
            {REACTION_CATALOG_IDS.map((id) => (
              <li key={id}>
                <label className="reaction-check-label">
                  <input
                    type="checkbox"
                    checked={reactionSel.has(id)}
                    onChange={() => toggleReaction(id)}
                  />
                  {REACTION_LABELS[id]}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <button type="submit" className="btn btn-primary" disabled={locked || mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </details>
  );
}
