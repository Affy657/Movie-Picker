import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEventLimits } from '@/features/events/hooks/useEventLimits';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  defaultTemplateFields,
  type ApplicableConfig,
  type TemplateFormFields,
} from '@/features/events/lib/eventTemplateDraft';
import { validateEventLimits } from '@/features/events/lib/eventLimitValidation';
import { patchEventConfig } from '@/features/events/api/eventsApi';
import { useMyGroups } from '@/features/events/hooks/useMyGroups';
import { ApiError, getErrorMessage } from '@/shared/api/apiError';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { eventDateTimeToLocal } from '@/shared/utils/eventDateTimeLocal';
import {
  type EventConfigPatchPayload,
  type EventData,
  type EventRecurrence,
  type WheelMode,
} from '@/features/events/types';
import { useTranslation } from '@/shared/i18n';
import {
  eventDateLocalError,
  isCreatorParticipant,
  normalizeConfig,
  savedSettingsOf,
  settingsPatch,
  validateSettingsDraft,
  type FieldErrors,
  type SavedSettings,
  type SaveState,
} from './hostEventSettingsDraft';

const TYPED_RULE_FIELDS: ReadonlyArray<keyof TemplateFormFields> = [
  'maxParticipants',
  'maxProposals',
  'maxVotes',
  'winnerCount',
];

const DATE_ERROR_REASONS: ReadonlySet<string> = new Set([
  'event_date_too_early',
  'event_date_too_far',
  'invalid_date_format',
]);

function shownSaveState(
  state: SaveState,
  dateError: string | undefined,
  dateAwaitingSave: boolean
): SaveState {
  if (dateError) return 'error';
  if (dateAwaitingSave) return 'pending';
  return state;
}

type HostEventSettingsDraftInput = {
  slug: string;
  event: EventData;
  open: boolean;
};

type SettingsSave = {
  body: EventConfigPatchPayload;
  settings: SavedSettings;
};

export function useHostEventSettingsDraft({ slug, event, open }: HostEventSettingsDraftInput) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const limitCaps = useEventLimits();
  const cfg = normalizeConfig(event.config);
  const drawnWinnerCount = event.winners?.length ?? 0;
  const initialFields = configToFields(cfg);

  const [eventTitle, setEventTitle] = useState(event.title);
  const [themeEmoji, setThemeEmoji] = useState(initialFields.themeEmoji);
  const [themeText, setThemeText] = useState(initialFields.themeText);
  const [eventDateLocal, setEventDateLocal] = useState(
    eventDateTimeToLocal(event.date, event.time)
  );
  const committedDateLocalRef = useRef(eventDateTimeToLocal(event.date, event.time));
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
  const [anonymousProposals, setAnonymousProposals] = useState(initialFields.anonymousProposals);
  const [richSharePreview, setRichSharePreview] = useState(initialFields.richSharePreview);
  const [recurrence, setRecurrence] = useState<EventRecurrence | null>(cfg.recurrence ?? null);
  const [groupId, setGroupId] = useState<string | null>(cfg.groupId ?? null);
  const [winnerCount, setWinnerCount] = useState(initialFields.winnerCount);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const performSaveRef = useRef<() => void>(() => {});
  const commitEventDateRef = useRef<(immediate: boolean) => void>(() => {});

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const isConnectedCreator = useMemo(
    () => isCreatorParticipant(event.myParticipant, event.participants),
    [event.myParticipant, event.participants]
  );

  const anonymousLocked = (event.movieCount ?? 0) > 0;
  const anonymousRule = anonymousLocked ? !!event.config?.anonymousProposals : anonymousProposals;

  const ruleFields: TemplateFormFields = {
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
    anonymousProposals: anonymousRule,
    winnerCount,
  };
  const templateDraft = buildTemplateDraft(ruleFields);

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
    setAnonymousProposals(next.anonymousProposals);
    setRichSharePreview(next.richSharePreview);
    setWinnerCount(next.winnerCount);
  }, []);

  const mutation = useMutation({
    mutationFn: ({ body }: SettingsSave) => patchEventConfig(slug, body),
    onSuccess: async (_config, { settings }) => {
      savedRef.current = settings;
      if (!saveQueuedRef.current) setSaveState('saved');
      setSaveError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.event.detail(slug) }),
        invalidateMyNights(queryClient),
      ]);
    },
    onError: (e) => {
      setSaveState('error');
      const message = getErrorMessage(e, t('events.settings.fallbackError'));
      if (ApiError.is(e) && e.reason && DATE_ERROR_REASONS.has(e.reason)) {
        setFieldErrors((current) => ({ ...current, date: message }));
        return;
      }
      setSaveError(message);
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

  const setRuleFields = useCallback((patch: Partial<TemplateFormFields>) => {
    if (patch.participantLimitEnabled !== undefined)
      setParticipantLimitEnabled(patch.participantLimitEnabled);
    if (patch.maxParticipants !== undefined) setMaxParticipants(patch.maxParticipants);
    if (patch.proposalLimitEnabled !== undefined)
      setProposalLimitEnabled(patch.proposalLimitEnabled);
    if (patch.maxProposals !== undefined) setMaxProp(patch.maxProposals);
    if (patch.voteLimitEnabled !== undefined) setVoteLimitEnabled(patch.voteLimitEnabled);
    if (patch.maxVotes !== undefined) setMaxVotes(patch.maxVotes);
    if (patch.wheelMode !== undefined) setWheelMode(patch.wheelMode);
    if (patch.allowSeries !== undefined) setAllowSeries(patch.allowSeries);
    if (patch.anonymousProposals !== undefined) setAnonymousProposals(patch.anonymousProposals);
    if (patch.richSharePreview !== undefined) setRichSharePreview(patch.richSharePreview);
    if (patch.winnerCount !== undefined) setWinnerCount(patch.winnerCount);
    if (patch.themeEmoji !== undefined) setThemeEmoji(patch.themeEmoji);
    if (patch.themeText !== undefined) setThemeText(patch.themeText);
  }, []);

  const applyRulesPatch = useCallback(
    (patch: Partial<TemplateFormFields>) => {
      setRuleFields(patch);
      const typed = TYPED_RULE_FIELDS.some((field) => field in patch);
      scheduleAutoSave(!typed);
    },
    [setRuleFields, scheduleAutoSave]
  );

  const templateLimitsAreValid = () => {
    const { errors } = validateEventLimits(
      {
        proposalLimitEnabled,
        maxProposals: maxProp,
        participantLimitEnabled,
        maxParticipants,
        voteLimitEnabled,
        maxVotes,
        currentParticipantCount: 0,
        caps: limitCaps,
      },
      t
    );
    if (Object.keys(errors).length === 0) return true;
    setFieldErrors((current) => ({ ...current, ...errors }));
    return false;
  };

  const groups = useMyGroups(open && isConnectedCreator).data?.groups ?? [];

  const eventTemplates = useEventTemplates(open && isConnectedCreator, {
    draft: templateDraft,
    onError: setSaveError,
    onApply: (template) => {
      applyFields(template);
      scheduleAutoSave(true);
    },
  });
  const forgetAppliedTemplate = eventTemplates.forget;

  const applyDefaultRules = () => {
    setRuleFields({ ...defaultTemplateFields(), themeEmoji, themeText });
    forgetAppliedTemplate();
    scheduleAutoSave(true);
  };

  const hydrateFromEvent = useCallback(() => {
    setEventTitle(event.title);
    applyFields(normalizeConfig(event.config));
    const saved = savedSettingsOf(event);
    savedRef.current = saved;
    committedDateLocalRef.current = saved.dateLocal;
    setEventDateLocal(saved.dateLocal);
    setNotifyDateChange(true);
    setRecurrence(event.config?.recurrence ?? null);
    setGroupId(event.config?.groupId ?? null);
    forgetAppliedTemplate();
    setFieldErrors({});
    setSaveError(null);
    setSaveState('saved');
  }, [event, applyFields, forgetAppliedTemplate]);

  commitEventDateRef.current = (immediate) => {
    if (eventDateLocal === committedDateLocalRef.current) return;
    committedDateLocalRef.current = eventDateLocal;
    scheduleAutoSave(immediate);
  };
  const commitEventDate = useCallback(() => commitEventDateRef.current(false), []);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) hydrateFromEvent();
    if (!open && wasOpenRef.current) commitEventDateRef.current(true);
    wasOpenRef.current = open;
  }, [open, hydrateFromEvent]);

  performSaveRef.current = () => {
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true;
      return;
    }

    const committedDateLocal = committedDateLocalRef.current;
    const {
      errors,
      maxProposalsPerParticipant,
      maxParticipantsValue,
      maxVotesPerParticipant,
      winnerCount: winnerCountValue,
    } = validateSettingsDraft(
      {
        eventTitle,
        eventDateLocal: committedDateLocal,
        savedEventDateLocal: savedRef.current.dateLocal,
        proposalLimitEnabled,
        maxProposals: maxProp,
        participantLimitEnabled,
        maxParticipants,
        voteLimitEnabled,
        maxVotes,
        winnerCount,
        currentParticipantCount: event.participantCount ?? 0,
        drawnWinnerCount,
        caps: limitCaps,
      },
      t,
      new Date()
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
      anonymousProposals: anonymousRule,
      richSharePreview,
      winnerCount: winnerCountValue ?? savedRef.current.winnerCount,
      recurrence,
      groupId,
      dateLocal: committedDateLocal,
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

  const dateWasEdited = eventDateLocal !== savedRef.current.dateLocal;
  const dateAwaitingSave = eventDateLocal !== committedDateLocalRef.current;
  const liveDateError = dateWasEdited
    ? eventDateLocalError(eventDateLocal, t, new Date())
    : undefined;
  const shownFieldErrors: FieldErrors = liveDateError
    ? { ...fieldErrors, date: fieldErrors.date ?? liveDateError }
    : fieldErrors;

  return {
    eventTitle,
    setEventTitle,
    themeEmoji,
    setThemeEmoji,
    themeText,
    setThemeText,
    eventDateLocal,
    setEventDateLocal,
    commitEventDate,
    dateWasEdited,
    notifyDateChange,
    setNotifyDateChange,
    proposalLimitEnabled,
    maxProp,
    setMaxProp,
    participantLimitEnabled,
    maxParticipants,
    setMaxParticipants,
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
    groupId,
    setGroupId,
    groups,
    winnerCount,
    setWinnerCount,
    drawnWinnerCount,
    configLocked,
    anonymousLocked,
    recurrenceLocked,
    fieldErrors: shownFieldErrors,
    limitCaps,
    saveError,
    saveState: shownSaveState(saveState, liveDateError, dateAwaitingSave),
    scheduleAutoSave,
    templateDraft,
    ruleFields,
    applyRulesPatch,
    applyDefaultRules,
    templateLimitsAreValid,
    eventTemplates,
    isConnectedCreator,
  };
}
