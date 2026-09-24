import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  limitFieldOnEnable,
  type ApplicableConfig,
} from '@/features/events/lib/eventTemplateDraft';
import { patchEventConfig } from '@/features/events/api/eventsApi';
import { getErrorMessage } from '@/shared/api/apiError';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { eventDateTimeToLocal, splitDateTimeLocal } from '@/shared/utils/eventDateTimeLocal';
import { formatRelativeEventDate } from '@/shared/utils/formatRelativeEventDate';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  type EventConfigPatchPayload,
  type EventData,
  type EventRecurrence,
  type WheelMode,
} from '@/features/events/types';
import { useLocale, useTranslation } from '@/shared/i18n';
import {
  isCreatorParticipant,
  maxParticipantsHintFor,
  normalizeConfig,
  savedSettingsOf,
  settingsPatch,
  validateSettingsDraft,
  type FieldErrors,
  type SavedSettings,
  type SaveState,
} from './hostEventSettingsDraft';

type HostEventSettingsDraftInput = {
  slug: string;
  hostToken: string | null;
  event: EventData;
  open: boolean;
};

type SettingsSave = {
  body: EventConfigPatchPayload;
  settings: SavedSettings;
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
  const savedRef = useRef<SavedSettings>(savedSettingsOf(event));
  const saveInFlightRef = useRef(false);
  const saveQueuedRef = useRef(false);
  const [notifyDateChange, setNotifyDateChange] = useState(true);
  const [proposalLimitEnabled, setProposalLimitEnabled] = useState(
    initialFields.proposalLimitEnabled
  );
  const [maxProp, setMaxProp] = useState(initialFields.maxProposals);
  const [participantLimitEnabled, setParticipantLimitEnabled] = useState(
    initialFields.participantLimitEnabled
  );
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
    proposalLimitEnabled,
    maxProposals: maxProp,
    participantLimitEnabled,
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
    setProposalLimitEnabled(next.proposalLimitEnabled);
    setMaxProp(next.maxProposals);
    setParticipantLimitEnabled(next.participantLimitEnabled);
    setMaxParticipants(next.maxParticipants);
    setVoteLimitEnabled(next.voteLimitEnabled);
    setMaxVotes(next.maxVotes);
    setWheelMode(next.wheelMode);
    setAllowSeries(next.allowSeries);
    setRichSharePreview(next.richSharePreview);
    setWinnerCount(next.winnerCount);
  }, []);

  const mutation = useMutation({
    mutationFn: ({ body }: SettingsSave) => patchEventConfig(slug, hostToken, body),
    onSuccess: async (_config, { settings }) => {
      savedRef.current = settings;
      if (!saveQueuedRef.current) setSaveState('saved');
      setSaveError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug, hostToken) });
    },
    onError: (e) => {
      setSaveState('error');
      setSaveError(getErrorMessage(e, t('events.settings.fallbackError')));
    },
    onSettled: () => {
      saveInFlightRef.current = false;
      if (!saveQueuedRef.current) return;
      saveQueuedRef.current = false;
      performSaveRef.current();
    },
  });

  const scheduleAutoSave = useCallback((immediate = false) => {
    setSaveState('pending');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => performSaveRef.current(), immediate ? 0 : 600);
  }, []);

  const toggleProposalLimit = useCallback(
    (checked: boolean) => {
      setProposalLimitEnabled(checked);
      if (checked)
        setMaxProp((current) =>
          limitFieldOnEnable(current, MAX_PROPOSALS_PER_PARTICIPANT, DEFAULT_PROPOSAL_LIMIT)
        );
      scheduleAutoSave(true);
    },
    [scheduleAutoSave]
  );

  const toggleParticipantLimit = useCallback(
    (checked: boolean) => {
      setParticipantLimitEnabled(checked);
      if (checked)
        setMaxParticipants((current) =>
          limitFieldOnEnable(current, MAX_EVENT_PARTICIPANTS, DEFAULT_PARTICIPANT_LIMIT)
        );
      scheduleAutoSave(true);
    },
    [scheduleAutoSave]
  );

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
    const saved = savedSettingsOf(event);
    savedRef.current = saved;
    setEventDateLocal(saved.dateLocal);
    setNotifyDateChange(true);
    setRecurrence(event.config?.recurrence ?? null);
    forgetAppliedTemplate();
    setFieldErrors({});
    setSaveError(null);
    setSaveState('saved');
  }, [event, applyFields, forgetAppliedTemplate]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) hydrateFromEvent();
    wasOpenRef.current = open;
  }, [open, hydrateFromEvent]);

  performSaveRef.current = () => {
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    const {
      errors,
      maxProposalsPerParticipant,
      maxParticipantsValue,
      maxVotesPerParticipant,
      winnerCount: winnerCountValue,
    } = validateSettingsDraft(
      {
        eventTitle,
        eventDateLocal,
        proposalLimitEnabled,
        maxProp,
        participantLimitEnabled,
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

    const settings: SavedSettings = {
      title: eventTitle.trim(),
      theme: [themeEmoji, themeText.trim()].filter(Boolean).join(' '),
      maxProposalsPerParticipant,
      maxParticipants: maxParticipantsValue,
      maxVotesPerParticipant,
      wheelMode,
      allowSeries,
      richSharePreview,
      winnerCount: winnerCountValue ?? savedRef.current.winnerCount,
      recurrence,
      dateLocal: eventDateLocal,
    };
    const body = settingsPatch(settings, savedRef.current, notifyDateChange);
    if (Object.keys(body).length === 0) {
      setSaveState('saved');
      return;
    }

    saveInFlightRef.current = true;
    mutation.mutate({ body, settings });
  };

  const configLocked = drawnWinnerCount > 0;
  const recurrenceLocked = cfg.hasNextOccurrence ?? false;

  const liveDateTime = eventDateLocal.trim() ? splitDateTimeLocal(eventDateLocal) : null;
  const relativeDateLabel = liveDateTime
    ? formatRelativeEventDate(liveDateTime.date, locale)
    : null;
  const dateWasEdited = eventDateLocal !== savedRef.current.dateLocal;
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
    proposalLimitEnabled,
    toggleProposalLimit,
    maxProp,
    setMaxProp,
    participantLimitEnabled,
    toggleParticipantLimit,
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
