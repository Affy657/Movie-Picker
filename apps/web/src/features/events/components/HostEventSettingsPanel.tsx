import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import styles from './HostEventSettingsPanel.module.css';
import {
  REACTION_CATALOG_IDS,
  REACTION_LABELS,
  type ReactionCatalogId,
} from '@/shared/constants/reactionCatalog';
import {
  datetimeLocalToEndDatePayload,
  isoToDatetimeLocalValue,
} from '@/shared/utils/eventDateTimeLocal';
import type {
  EventConfigData,
  EventConfigPatchPayload,
  EventData,
  WheelMode,
} from '@/features/events/types';
import { DEFAULT_EVENT_CONFIG } from '@/features/events/types';
import { isWheelMode } from '@/shared/utils/wheelMode';

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
  const locked = !!event.isFinished || !!event.winnerMovie;

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
  const flashTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(flashTimerRef.current), []);
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
    mutationFn: (body: EventConfigPatchPayload) => patchEventConfig(slug, hostToken, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
      setFlashOk(true);
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashOk(false), 4000);
    },
    onError: (e) => {
      setFormError(getErrorMessage(e, 'Enregistrement impossible'));
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
      className={styles.root}
      onToggle={(ev) => {
        const el = ev.currentTarget;
        if (el.open) hydrateFromEvent();
      }}
    >
      <summary className={styles.summary}>Paramètres de la soirée</summary>
      <p className={styles.lead}>
        Réservé à l&apos;hôte — thème, fin de validité, limite de propositions, mode de roue et
        réactions proposées.
      </p>
      {locked && (
        <p className={styles.locked}>
          Cette soirée n&apos;est plus modifiable (terminée ou roue déjà lancée).
        </p>
      )}
      {flashOk && <p className={styles.successBanner} role="status" aria-live="polite">Paramètres enregistrés.</p>}
      {formError && <p className="error" role="alert">{formError}</p>}
      <form className={`form ${styles.form}`} onSubmit={onSubmit}>
        <div className={styles.field}>
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

        <div className={styles.field}>
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

        <div className={styles.field}>
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

        <div className={styles.field}>
          <label className="label" htmlFor="host-cfg-wheel">
            Mode de la roue
          </label>
          <select
            id="host-cfg-wheel"
            className={`input ${styles.select}`}
            value={wheelMode}
            onChange={(e) => {
              const v = e.target.value;
              if (isWheelMode(v)) setWheelMode(v);
            }}
            disabled={locked || mutation.isPending}
          >
            <option value="strictRandom">Aléatoire strict (égalité)</option>
            <option value="weightedByVotes">Pondéré par les votes</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={`label ${styles.checkLabel}`}>
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
          className={`${styles.field} ${styles.fieldset}`}
          disabled={locked || mutation.isPending}
        >
          <legend className="label">Réactions autorisées</legend>
          <p className={`hint ${styles.fieldsetHint}`}>
            Toutes cochées équivaut au catalogue complet.
          </p>
          <ul className={styles.reactionList}>
            {REACTION_CATALOG_IDS.map((id) => (
              <li key={id}>
                <label className={styles.checkLabel}>
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
