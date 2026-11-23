import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { SlidersHorizontal } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { invalidateMyNights } from '@/shared/api/invalidateMyNights';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { useLocale, useTranslation, type Translate } from '@/shared/i18n';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { formatEventTitleDate } from '@/shared/utils/formatMyEventsListDate';
import { ROUTES } from '@/app/routes';
import { useCloseOnPageChange } from '@/shared/hooks/useCloseOnPageChange';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  createEvent as createEventApi,
  fetchEventConfig,
  fetchMyEventsList,
  patchEventConfig,
} from '@/features/events/api/eventsApi';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  eventStartIssue,
  eventStartIssueMessage,
  isPastEventDateTime,
  validateCreateEventDraft,
  type CreateEventFieldErrors,
} from '@/features/events/lib/createEventValidation';
import { validateEventLimits } from '@/features/events/lib/eventLimitValidation';
import { defaultEventStart, todayInEventZone } from '@/features/events/lib/eventStartShortcuts';
import {
  buildTemplateDraft,
  configToFields,
  defaultTemplateFields,
  draftToConfigPatch,
  isSameTemplateConfig,
  suggestTemplateName,
  templateToDraft,
  type ApplicableConfig,
  type TemplateConfigDraft,
  type TemplateFormFields,
} from '@/features/events/lib/eventTemplateDraft';
import type { EventTemplateData } from '@/features/events/types';
import CreateEventGroup from './CreateEventGroup';
import { useMyGroups } from '@/features/events/hooks/useMyGroups';
import CreateEventInvitation, { type CreatedNight } from './CreateEventInvitation';
import CreateEventRulesStep, { type RulesChoice } from './CreateEventRulesStep';
import CreateEventTheme from './CreateEventTheme';
import CreateEventWhen from './CreateEventWhen';
import {
  forgetCreateEventDraft,
  readCreateEventDraft,
  saveCreateEventDraft,
  type CreateEventDraftSnapshot,
} from './createEventDraftStorage';
import styles from './CreateEventDialog.module.css';

export type CreateEventReuse = { slug: string; title: string };

type CreateEventDialogProps = {
  open: boolean;
  onClose: () => void;
  reuse?: CreateEventReuse | null;
  groupId?: string | null;
};

type Step = 'form' | 'invitation';

type RulesOrigin =
  | { kind: 'defaults' }
  | { kind: 'template' }
  | { kind: 'night'; slug: string; title: string; draft: TemplateConfigDraft | null };

function withoutTheme(draft: TemplateConfigDraft): TemplateConfigDraft {
  return { ...draft, theme: null };
}

function sameRules(left: TemplateConfigDraft, right: TemplateConfigDraft): boolean {
  return isSameTemplateConfig(withoutTheme(left), withoutTheme(right));
}

type RulesSummary =
  | { kind: 'template'; template: EventTemplateData }
  | { kind: 'night'; slug: string; title: string }
  | { kind: 'defaults' }
  | { kind: 'custom' };

function summarizeRules(
  draft: TemplateConfigDraft,
  origin: RulesOrigin,
  appliedTemplate: EventTemplateData | null
): RulesSummary {
  if (
    origin.kind === 'template' &&
    appliedTemplate !== null &&
    sameRules(draft, templateToDraft(appliedTemplate))
  ) {
    return { kind: 'template', template: appliedTemplate };
  }
  if (origin.kind === 'night' && origin.draft !== null && sameRules(draft, origin.draft)) {
    return { kind: 'night', slug: origin.slug, title: origin.title };
  }
  if (sameRules(draft, buildTemplateDraft(defaultTemplateFields()))) return { kind: 'defaults' };
  return { kind: 'custom' };
}

function rulesLabel(summary: RulesSummary, t: Translate): string {
  switch (summary.kind) {
    case 'template':
      return summary.template.name;
    case 'night':
      return t('events.create.rules.like', { title: summary.title });
    case 'defaults':
      return t('events.create.rules.defaults');
    default:
      return t('events.create.rules.custom');
  }
}

function hasLimitError(errors: CreateEventFieldErrors): boolean {
  return Boolean(errors.maxParticipants || errors.maxProposals || errors.maxVotes);
}

function firstInvalidPart(errors: CreateEventFieldErrors): 'title' | 'when' | 'rules' | null {
  if (errors.title) return 'title';
  if (errors.date || errors.time) return 'when';
  if (hasLimitError(errors)) return 'rules';
  return null;
}

function distinctNights(nights: ReadonlyArray<CreateEventReuse | null>): CreateEventReuse[] {
  const listed: CreateEventReuse[] = [];
  for (const night of nights) {
    if (night && !listed.some((other) => other.slug === night.slug)) listed.push(night);
  }
  return listed;
}

function useCloseUnlessCreating(
  creating: boolean,
  onClose: () => void,
  insideRef: RefObject<HTMLElement | null>
): () => void {
  useEffect(() => {
    const dialog = insideRef.current?.closest('dialog');
    if (!creating || !dialog) return;
    const keepOpen = (event: Event) => event.preventDefault();
    dialog.addEventListener('cancel', keepOpen);
    return () => dialog.removeEventListener('cancel', keepOpen);
  }, [creating, insideRef]);

  return () => {
    if (!creating) {
      onClose();
      return;
    }
    const dialog = insideRef.current?.closest('dialog');
    if (dialog && !dialog.open) dialog.showModal();
  };
}

function startingDraft(
  saved: CreateEventDraftSnapshot | null,
  reusesANight: boolean,
  presetGroupId: string | null
): CreateEventDraftSnapshot {
  const start = defaultEventStart(Date.now());
  if (!saved) {
    return { ...start, typedTitle: null, fields: defaultTemplateFields(), groupId: presetGroupId };
  }
  return {
    ...saved,
    fields: reusesANight ? defaultTemplateFields() : saved.fields,
    groupId: presetGroupId ?? saved.groupId,
  };
}

function whenFeedback(date: string, time: string, typedError: string | undefined, t: Translate) {
  const now = new Date();
  const issue = eventStartIssue(date, time, now);
  const issueMessage = issue ? eventStartIssueMessage(issue, t, 'create') : undefined;
  const past = !issue && isPastEventDateTime(date, time, now);
  return {
    dateError: typedError ?? issueMessage,
    pastDateHint: past ? t('events.create.pastDateHint') : undefined,
  };
}

function useLastHostedNight(enabled: boolean): CreateEventReuse | null {
  const { data } = useQuery({
    queryKey: queryKeys.myEvents.lastHosted,
    queryFn: () => fetchMyEventsList('finished', 0),
    enabled,
  });
  const hosted = (data?.events ?? []).filter((night) => night.isCreator);
  const latest = [...hosted].sort((left, right) =>
    `${right.date}T${right.time}`.localeCompare(`${left.date}T${left.time}`)
  )[0];
  return latest ? { slug: latest.slug, title: latest.title } : null;
}

export default function CreateEventDialog({
  open,
  onClose,
  reuse = null,
  groupId: presetGroupId = null,
}: Readonly<CreateEventDialogProps>) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { track } = useAnalytics();

  const [today] = useState(() => todayInEventZone(Date.now()));
  const [initial] = useState(() =>
    startingDraft(readCreateEventDraft(), reuse !== null, presetGroupId)
  );
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [typedTitle, setTypedTitle] = useState<string | null>(initial.typedTitle);
  const [fields, setFields] = useState<TemplateFormFields>(initial.fields);
  const [origin, setOrigin] = useState<RulesOrigin>({ kind: 'defaults' });
  const [reuseTarget, setReuseTarget] = useState<CreateEventReuse | null>(reuse);
  const [pickedGroupId, setPickedGroupId] = useState<string | null>(initial.groupId);
  const myGroupsQuery = useMyGroups(open && !!user);
  const myGroups = myGroupsQuery.data?.groups ?? [];
  const chosenGroup = myGroups.find((group) => group.id === pickedGroupId) ?? null;
  const groupIdToSend = myGroupsQuery.isSuccess ? (chosenGroup?.id ?? null) : pickedGroupId;
  const [step, setStep] = useState<Step>('form');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CreateEventFieldErrors>({});
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedNight | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'form') return;
    saveCreateEventDraft({ typedTitle, date, time, fields, groupId: pickedGroupId });
  }, [step, typedTitle, date, time, fields, pickedGroupId]);

  const suggestedTitle = t('events.create.defaultTitle', {
    date: formatEventTitleDate(date, locale),
  });
  const shownTitle = typedTitle ?? suggestedTitle;
  const title = shownTitle.trim() === '' ? suggestedTitle : shownTitle;
  const draft = buildTemplateDraft(fields);

  const applyConfig = useCallback(
    (config: ApplicableConfig) => setFields(configToFields(config)),
    []
  );

  const eventTemplates = useEventTemplates(!!user, {
    draft,
    onError: setTemplateError,
    onApply: (template) => {
      applyConfig(template);
      setOrigin({ kind: 'template' });
    },
  });

  const lastNight = useLastHostedNight(open && !!user);

  const reusedConfigQuery = useQuery({
    queryKey: queryKeys.event.reusableConfig(reuseTarget?.slug),
    queryFn: () => fetchEventConfig(reuseTarget!.slug),
    enabled: !!reuseTarget && !!user,
  });
  const reusedConfig = reusedConfigQuery.data;
  const appliedReuse = useRef<string | null>(null);
  const forgetTemplate = eventTemplates.forget;
  useEffect(() => {
    if (!reuseTarget || !reusedConfig || appliedReuse.current === reuseTarget.slug) return;
    appliedReuse.current = reuseTarget.slug;
    const reusedFields = configToFields(reusedConfig);
    setFields(reusedFields);
    forgetTemplate();
    setOrigin({
      kind: 'night',
      slug: reuseTarget.slug,
      title: reuseTarget.title,
      draft: buildTemplateDraft(reusedFields),
    });
  }, [reuseTarget, reusedConfig, forgetTemplate]);

  const rules = summarizeRules(draft, origin, eventTemplates.appliedTemplate);
  const matchesSavedTemplate = eventTemplates.templates.some((template) =>
    isSameTemplateConfig(draft, templateToDraft(template))
  );
  const canSaveTemplate =
    rules.kind !== 'defaults' && !matchesSavedTemplate && !eventTemplates.isBusy;

  const updateFields = (patch: Partial<TemplateFormFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => ({
      ...current,
      maxParticipants: undefined,
      maxProposals: undefined,
      maxVotes: undefined,
    }));
  };

  const chooseRules = (choice: RulesChoice) => {
    if (choice.kind === 'template') {
      eventTemplates.apply(choice.template);
      return;
    }
    if (choice.kind === 'night') {
      appliedReuse.current = null;
      setReuseTarget({ slug: choice.slug, title: choice.title });
      return;
    }
    const defaults = defaultTemplateFields();
    setFields((current) => ({
      ...defaults,
      themeEmoji: current.themeEmoji,
      themeText: current.themeText,
    }));
    forgetTemplate();
    setOrigin({ kind: 'defaults' });
  };

  const configPatch = draftToConfigPatch(draft);
  const creationRequest = useRef<{ draft: string; id: string } | null>(null);
  const createAction = useCallback(async () => {
    const requestDraft = JSON.stringify([title, date, time, groupIdToSend]);
    if (creationRequest.current?.draft !== requestDraft) {
      creationRequest.current = { draft: requestDraft, id: crypto.randomUUID() };
    }
    const res = await createEventApi({
      title,
      date,
      time,
      clientRequestId: creationRequest.current.id,
      groupId: groupIdToSend,
    });
    track('event_created');
    forgetCreateEventDraft();
    if (res.creatorParticipant) {
      setStoredParticipant(res.slug, res.creatorParticipant.id, res.creatorParticipant.pseudo);
    }
    let configNotSaved = false;
    try {
      await patchEventConfig(res.slug, null, configPatch);
    } catch {
      configNotSaved = true;
    }
    void invalidateMyNights(queryClient);
    setCreated({
      slug: res.slug,
      title,
      date,
      time,
      url: `${globalThis.location.origin}${ROUTES.eventDetail(res.slug)}`,
      configNotSaved,
      group: chosenGroup
        ? {
            name: chosenGroup.name,
            memberCount: chosenGroup.memberCount,
            preview: chosenGroup.memberPreview,
          }
        : null,
    });
    setStep('invitation');
  }, [title, date, time, chosenGroup, groupIdToSend, configPatch, queryClient, track]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(createAction, t('events.create.fallbackError'));
  const closeAndForget = useCallback(() => {
    forgetCreateEventDraft();
    onClose();
  }, [onClose]);
  const requestClose = useCloseUnlessCreating(loading, closeAndForget, titleRef);
  useCloseOnPageChange(() => {
    if (!loading && step !== 'invitation') closeAndForget();
  });

  const limitErrors = () =>
    validateEventLimits(
      {
        proposalLimitEnabled: fields.proposalLimitEnabled,
        maxProposals: fields.maxProposals,
        participantLimitEnabled: fields.participantLimitEnabled,
        maxParticipants: fields.maxParticipants,
        voteLimitEnabled: fields.voteLimitEnabled,
        maxVotes: fields.maxVotes,
        currentParticipantCount: 0,
      },
      t
    ).errors;

  const handleSubmit = () => {
    const errors = {
      ...validateCreateEventDraft({ title, date, time }, t, new Date()),
      ...limitErrors(),
    };
    setFieldErrors(errors);
    const invalidPart = firstInvalidPart(errors);
    if (invalidPart === 'title') titleRef.current?.focus();
    if (invalidPart === 'rules') setRulesOpen(true);
    if (invalidPart === null) void submit();
  };

  const suggestName = () => {
    const errors = limitErrors();
    setFieldErrors((current) => ({ ...current, ...errors }));
    if (hasLimitError(errors)) return null;
    return suggestTemplateName(
      draft.theme,
      eventTemplates.templates.map((template) => template.name),
      (index) => t('events.settings.templates.numberedName', { index })
    );
  };

  const saveTemplate = (name: string) => {
    eventTemplates.saveAs(name);
    setOrigin({ kind: 'template' });
  };

  const openNight = (state?: { openPropose: true }) => {
    if (!created) return;
    onClose();
    void navigate(ROUTES.eventDetail(created.slug), state ? { state } : undefined);
  };

  const { dateError, pastDateHint } = whenFeedback(date, time, fieldErrors.date, t);

  if (step === 'invitation' && created) {
    return (
      <CreateEventInvitation
        open={open}
        onClose={onClose}
        night={created}
        onOpen={() => openNight()}
        onPropose={() => openNight({ openPropose: true })}
      />
    );
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onClose={requestClose}
        title={t('events.create.title')}
        footer={
          <div className={styles.footer}>
            {error ? (
              <p className={clsx('error', styles.footerError)} role="alert">
                {error}
              </p>
            ) : null}
            <Button className={styles.rulesTrigger} onClick={() => setRulesOpen(true)}>
              <SlidersHorizontal size={ICON_SIZE.md} aria-hidden />
              <span className={styles.rulesTriggerLabel}>
                {t('events.create.rules.trigger', { name: rulesLabel(rules, t) })}
              </span>
            </Button>
            <span className={styles.footerSpacer} />
            <Button variant="primary" loading={loading} onClick={handleSubmit}>
              {loading ? t('events.create.submitting') : t('events.create.submit')}
            </Button>
          </div>
        }
      >
        <CreateEventWhen
          today={today}
          date={date}
          time={time}
          dateError={dateError}
          timeError={fieldErrors.time}
          pastDateHint={pastDateHint}
          onDateChange={(next) => {
            setDate(next);
            setFieldErrors((current) => ({ ...current, date: undefined }));
          }}
          onTimeChange={(next) => {
            setTime(next);
            setFieldErrors((current) => ({ ...current, time: undefined }));
          }}
        />
        <section className={styles.section}>
          <Field
            label={<span className={styles.sectionTitle}>{t('events.create.nameLabel')}</span>}
            htmlFor="create-title"
            error={fieldErrors.title}
            className={styles.inlineField}
          >
            {({ id, describedBy, invalid }) => (
              <input
                ref={titleRef}
                id={id}
                type="text"
                className="input"
                value={shownTitle}
                onChange={(event) => {
                  setTypedTitle(event.target.value);
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                onBlur={(event) => {
                  if (event.target.value.trim() === '') setTypedTitle(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSubmit();
                }}
                maxLength={200}
                placeholder={t('events.create.titlePlaceholder')}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </Field>
        </section>
        <CreateEventGroup
          groups={myGroups}
          groupId={chosenGroup?.id ?? null}
          onChange={setPickedGroupId}
        />
        <CreateEventTheme
          emoji={fields.themeEmoji}
          text={fields.themeText}
          onChange={(themeEmoji, themeText) => updateFields({ themeEmoji, themeText })}
        />
      </ResponsiveDialog>
      <CreateEventRulesStep
        open={open && rulesOpen}
        onClose={() => setRulesOpen(false)}
        fields={fields}
        errors={fieldErrors}
        onChange={updateFields}
        selected={rules.kind === 'custom' ? null : rules.kind}
        selectedTemplateId={rules.kind === 'template' ? rules.template.id : null}
        selectedNightSlug={rules.kind === 'night' ? rules.slug : null}
        nights={distinctNights([reuse, lastNight])}
        templates={eventTemplates.templates}
        onChoose={chooseRules}
        canSaveTemplate={canSaveTemplate}
        suggestTemplateName={suggestName}
        onSaveTemplate={saveTemplate}
        templateError={templateError}
      />
    </>
  );
}
