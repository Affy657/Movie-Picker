import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  type ApplicableConfig,
} from '@/features/events/lib/eventTemplateDraft';
import { patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { eventDateTimeToLocal, splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import { formatRelativeEventDate } from '@/shared/utils/formatRelativeEventDate';
import type {
  EventConfigPatchPayload,
  EventData,
  EventRecurrence,
  WheelMode,
} from '@/features/events/types';
import { useLocale, useTranslation } from '@/shared/i18n';
import {
  dateTimePatch,
  isCreatorParticipant,
  maxParticipantsHintFor,
  normalizeConfig,
  recurrencePatch,
  titlePatch,
  validateSettingsDraft,
  type FieldErrors,
  type SaveState,
} from './hostEventSettingsDraft';

type HostEventSettingsDraftInput = {
  slug: string;
  hostToken: string | null;
  event: EventData;
  open: boolean;
};

export function useHostEventSettingsDraft({
  slug,
  hostToken,
  event,
  open,
}: HostEventSettingsDraftInput) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const queryClient = useQueryClient();
  const cfg = normalizeConfig(event.config);
  const drawnWinnerCount = event.winners?.length ?? 0;
  const initialFields = configToFields(cfg);

  const [eventTitle, setEventTitle] = useState(event.title);
  const [themeEmoji, setThemeEmoji] = useState(initialFields.themeEmoji);
  const [themeText, setThemeText] = useState(initialFields.themeText);
  const [themeOpen, setThemeOpen] = useState(false);
  const [eventDateLocal, setEventDateLocal] = useState(
    eventDateTimeToLocal(event.date, event.time)
  );
  const initialDateLocalRef = useRef(eventDateTimeToLocal(event.date, event.time));
  const [notifyDateChange, setNotifyDateChange] = useState(true);
  const [maxProp, setMaxProp] = useState(initialFields.maxProposals);
  const [maxParticipants, setMaxParticipants] = useState(initialFields.maxParticipants);
  const [voteLimitEnabled, setVoteLimitEnabled] = useState(initialFields.voteLimitEnabled);
  const [maxVotes, setMaxVotes] = useState(initialFields.maxVotes);
  const [wheelMode, setWheelMode] = useState<WheelMode>(initialFields.wheelMode);
  const [allowSeries, setAllowSeries] = useState(initialFields.allowSeries);
  const [richSharePreview, setRichSharePreview] = useState(initialFields.richSharePreview);
  const [recurrence, setRecurrence] = useState<EventRecurrence | null>(cfg.recurrence ?? null);
  const [winnerCount, setWinnerCount] = useState(initialFields.winnerCount);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const performSaveRef = useRef<() => void>(() => {});

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const maxParticipantsHint = maxParticipantsHintFor(event.participantCount ?? 0, t);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const isConnectedCreator = useMemo(
    () => isCreatorParticipant(event.myParticipant, event.participants),
    [event.myParticipant, event.participants]
  );

  const templateDraft = buildTemplateDraft({
    themeEmoji,
    themeText,
    maxProposals: maxProp,
    maxParticipants,
    voteLimitEnabled,
    maxVotes,
    wheelMode,
    richSharePreview,
    allowSeries,
    winnerCount,
  });

  const applyFields = useCallback((config: ApplicableConfig) => {
    const next = configToFields(config);
    setThemeEmoji(next.themeEmoji);
    setThemeText(next.themeText);
    setMaxProp(next.maxProposals);
    setMaxParticipants(next.maxParticipants);
    setVoteLimitEnabled(next.voteLimitEnabled);
    setMaxVotes(next.maxVotes);
    setWheelMode(next.wheelMode);
    setAllowSeries(next.allowSeries);
    setRichSharePreview(next.richSharePreview);
    setWinnerCount(next.winnerCount);
  }, []);

  const mutation = useMutation({
    mutationFn: (body: EventConfigPatchPayload) => patchEventConfig(slug, hostToken, body),
    onSuccess: async (_config, body) => {
      if (body.date && body.time)
        initialDateLocalRef.current = eventDateTimeToLocal(body.date, body.time);
      setSaveState('saved');
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    },
    onError: (e) => {
      setSaveState('error');
      setSaveError(getErrorMessage(e, t('events.settings.fallbackError')));
    },
  });

  const scheduleAutoSave = useCallback((immediate = false) => {
    setSaveState('pending');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => performSaveRef.current(), immediate ? 0 : 600);
  }, []);

  const eventTemplates = useEventTemplates(open && isConnectedCreator, {
    draft: templateDraft,
    onError: setSaveError,
    onApply: (template) => {
      applyFields(template);
      scheduleAutoSave(true);
    },
  });
  const forgetAppliedTemplate = eventTemplates.forget;

  const hydrateFromEvent = useCallback(() => {
    setEventTitle(event.title);
    applyFields(normalizeConfig(event.config));
    setThemeOpen(false);
    const nextDateLocal = eventDateTimeToLocal(event.date, event.time);
    setEventDateLocal(nextDateLocal);
    initialDateLocalRef.current = nextDateLocal;
    setNotifyDateChange(true);
    setRecurrence(event.config?.recurrence ?? null);
    forgetAppliedTemplate();
    setFieldErrors({});
    setSaveError(null);
    setSaveState('saved');
  }, [event.title, event.config, event.date, event.time, applyFields, forgetAppliedTemplate]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) hydrateFromEvent();
    wasOpenRef.current = open;
  }, [open, hydrateFromEvent]);

  performSaveRef.current = () => {
    const {
      errors,
      maxProposalsPerParticipant,
      maxParticipantsValue,
      maxVotesPerParticipant,
      winnerCount: winnerCountValue,
      eventDateTime,
    } = validateSettingsDraft(
      {
        eventTitle,
        eventDateLocal,
        maxProp,
        maxParticipants,
        voteLimitEnabled,
        maxVotes,
        winnerCount,
        currentParticipantCount: event.participantCount ?? 0,
        drawnWinnerCount,
      },
      t
    );

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveState('error');
      return;
    }

    const theme = [themeEmoji, themeText.trim()].filter(Boolean).join(' ');

    mutation.mutate({
      ...titlePatch(eventTitle.trim(), event.title),
      ...(theme !== (cfg.theme ?? '') ? { theme } : {}),
      ...(maxProposalsPerParticipant !== cfg.maxProposalsPerParticipant
        ? { maxProposalsPerParticipant }
        : {}),
      ...(maxParticipantsValue !== cfg.maxParticipants
        ? { maxParticipants: maxParticipantsValue }
        : {}),
      ...(maxVotesPerParticipant !== (cfg.maxVotesPerParticipant ?? null)
        ? { maxVotesPerParticipant: maxVotesPerParticipant ?? 0 }
        : {}),
      ...(wheelMode !== cfg.wheelMode ? { wheelMode } : {}),
      ...(allowSeries !== (cfg.allowSeries ?? false) ? { allowSeries } : {}),
      ...(richSharePreview !== (cfg.richSharePreview ?? true) ? { richSharePreview } : {}),
      ...(winnerCountValue !== null && winnerCountValue !== cfg.winnerCount
        ? { winnerCount: winnerCountValue }
        : {}),
      ...recurrencePatch(recurrence, cfg.recurrence ?? null),
      ...dateTimePatch(
        eventDateTime,
        eventDateLocal !== initialDateLocalRef.current,
        notifyDateChange
      ),
    });
  };

  const configLocked = drawnWinnerCount > 0;
  const recurrenceLocked = cfg.hasNextOccurrence ?? false;

  const liveDateTime = eventDateLocal.trim() ? splitDateTimeLocal(eventDateLocal) : null;
  const relativeDateLabel = liveDateTime
    ? formatRelativeEventDate(liveDateTime.date, locale)
    : null;
  const dateWasEdited = eventDateLocal !== initialDateLocalRef.current;
  const themePreview = [themeEmoji, themeText.trim()].filter(Boolean).join(' ');

  return {
    eventTitle,
    setEventTitle,
    themeEmoji,
    setThemeEmoji,
    themeText,
    setThemeText,
    themeOpen,
    setThemeOpen,
    themePreview,
    eventDateLocal,
    setEventDateLocal,
    relativeDateLabel,
    dateWasEdited,
    notifyDateChange,
    setNotifyDateChange,
    maxProp,
    setMaxProp,
    maxParticipants,
    setMaxParticipants,
    maxParticipantsHint,
    voteLimitEnabled,
    setVoteLimitEnabled,
    maxVotes,
    setMaxVotes,
    wheelMode,
    setWheelMode,
    allowSeries,
    setAllowSeries,
    recurrence,
    setRecurrence,
    winnerCount,
    setWinnerCount,
    drawnWinnerCount,
    configLocked,
    recurrenceLocked,
    fieldErrors,
    saveError,
    saveState,
    scheduleAutoSave,
    templateDraft,
    eventTemplates,
    isConnectedCreator,
  };
}
