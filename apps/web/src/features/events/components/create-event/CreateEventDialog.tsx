import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
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
import type { FriendGroupSummary } from '@/features/events/api/myGroupsApi';
import { loadEventLimits, useEventLimits } from '@/features/events/hooks/useEventLimits';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  earliestOpenStartLocal,
  eventStartIssue,
  eventStartIssueMessage,
  isPastEventDateTime,
  latestEventDate,
  validateCreateEventDraft,
  type CreateEventFieldErrors,
} from '@/features/events/lib/createEventValidation';
import { validateEventLimits } from '@/features/events/lib/eventLimitValidation';
import { firstRuleError } from '@/features/events/lib/eventLimits';
import { todayInEventZone } from '@/features/events/lib/eventStartShortcuts';
import {
  buildTemplateDraft,
  configToFields,
  defaultTemplateFields,
  draftToConfigPatch,
  isSameTemplateConfig,
  templateToDraft,
  type ApplicableConfig,
  type TemplateConfigDraft,
  type TemplateFormFields,
} from '@/features/events/lib/eventTemplateDraft';
import type { EventLimitCaps, EventTemplateData } from '@/features/events/types';
import EventTemplateSaveBar from '@/features/events/components/EventTemplateSaveBar';
import NightDateField from '@/features/events/components/night-form/NightDateField';
import NightFormLayout, {
  useNightFormBodyClass,
} from '@/features/events/components/night-form/NightFormLayout';
import NightGroupField from '@/features/events/components/night-form/NightGroupField';
import NightRuleStarts, {
  ManageTemplatesButton,
  type RuleStart,
} from '@/features/events/components/night-form/NightRuleStarts';
import NightRules from '@/features/events/components/night-form/NightRules';
import NightThemeField from '@/features/events/components/night-form/NightThemeField';
import nightStyles from '@/features/events/components/night-form/NightForm.module.css';
import { useMyGroups } from '@/features/events/hooks/useMyGroups';
import CreateEventInvitation, { type CreatedNight } from './CreateEventInvitation';
import {
  forgetCreateEventDraft,
  readCreateEventDraft,
  saveCreateEventDraft,
  startingCreateEventDraft,
} from './createEventDraftStorage';

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
      return t('events.create.rules.likeItem', { title: summary.title });
    case 'defaults':
      return t('events.create.rules.defaultsItem');
    default:
      return t('events.form.rulesCustom');
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

function groupNoteLabel(others: number, t: Translate): string {
  if (others > 1) return t('events.form.groupNotifiedMany', { count: others });
  if (others === 1) return t('events.form.groupNotifiedOne');
  return t('events.create.groupHintAlone');
}

function GroupNote({ group, t }: Readonly<{ group: FriendGroupSummary; t: Translate }>) {
  const label = groupNoteLabel(group.memberCount - 1, t);
  return (
    <p className={nightStyles.message}>
      <Users size={ICON_SIZE.sm} aria-hidden />
      <span className={nightStyles.messageText}>{label}</span>
    </p>
  );
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
  const isMobile = useIsMobile();
  const bodyClassName = useNightFormBodyClass();

  const [today] = useState(() => todayInEventZone(Date.now()));
  const [dateBounds] = useState(() => {
    const now = new Date();
    return { min: earliestOpenStartLocal(now).slice(0, 10), max: latestEventDate(now) };
  });
  const [initial] = useState(() =>
    startingCreateEventDraft(readCreateEventDraft(), reuse !== null, presetGroupId, Date.now())
  );
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [typedTitle, setTypedTitle] = useState<string | null>(initial.typedTitle);
  const [fields, setFields] = useState<TemplateFormFields>(initial.fields);
  const [origin, setOrigin] = useState<RulesOrigin>({ kind: 'defaults' });
  const [reuseTarget, setReuseTarget] = useState<CreateEventReuse | null>(reuse);
  const [pickedGroupId, setPickedGroupId] = useState<string | null>(initial.groupId);
  const limitCaps = useEventLimits();
  const myGroupsQuery = useMyGroups(open && !!user);
  const myGroups = myGroupsQuery.data?.groups ?? [];
  const chosenGroup = myGroups.find((group) => group.id === pickedGroupId) ?? null;
  const groupIdToSend = myGroupsQuery.isSuccess ? (chosenGroup?.id ?? null) : pickedGroupId;
  const [step, setStep] = useState<Step>('form');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CreateEventFieldErrors>({});
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedNight | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== 'form') return;
    saveCreateEventDraft({
      typedTitle,
      date,
      time,
      fields,
      groupId: pickedGroupId,
      openedFromGroupId: presetGroupId,
    });
  }, [step, typedTitle, date, time, fields, pickedGroupId, presetGroupId]);

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

  const updateFields = (patch: Partial<TemplateFormFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    setFieldErrors((current) => ({
      ...current,
      maxParticipants: undefined,
      maxProposals: undefined,
      maxVotes: undefined,
    }));
  };

  const chooseRules = (choice: RuleStart) => {
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
      await patchEventConfig(res.slug, configPatch);
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

  const limitErrors = (caps: EventLimitCaps | null) =>
    validateEventLimits(
      {
        proposalLimitEnabled: fields.proposalLimitEnabled,
        maxProposals: fields.maxProposals,
        participantLimitEnabled: fields.participantLimitEnabled,
        maxParticipants: fields.maxParticipants,
        voteLimitEnabled: fields.voteLimitEnabled,
        maxVotes: fields.maxVotes,
        currentParticipantCount: 0,
        caps,
      },
      t
    ).errors;

  const showRuleError = (errors: CreateEventFieldErrors) => {
    if (isMobile) {
      setRulesOpen(true);
      return;
    }
    const target = firstRuleError('create', errors);
    if (target) document.getElementById(target.inputId)?.focus();
  };

  const handleSubmit = async () => {
    const caps = limitCaps ?? (await loadEventLimits(queryClient));
    const errors = {
      ...validateCreateEventDraft({ title, date, time }, t, new Date()),
      ...limitErrors(caps),
    };
    setFieldErrors(errors);
    const invalidPart = firstInvalidPart(errors);
    if (invalidPart === 'title') titleRef.current?.focus();
    if (invalidPart === 'rules') showRuleError(errors);
    if (invalidPart === null) void submit();
  };

  const limitsAreValid = () => {
    const errors = limitErrors(limitCaps);
    setFieldErrors((current) => ({ ...current, ...errors }));
    return !hasLimitError(errors);
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

  const main = (
    <>
      <NightDateField
        id="create-when"
        value={{ date, time }}
        onChange={(next) => {
          setDate(next.date);
          setTime(next.time);
          setFieldErrors((current) => ({ ...current, date: undefined, time: undefined }));
        }}
        min={dateBounds.min}
        max={dateBounds.max}
        today={today}
        error={dateError ?? fieldErrors.time}
        notice={pastDateHint}
      />
      <div className={nightStyles.block}>
        <Field
          label={<span className={nightStyles.blockTitle}>{t('events.create.nameLabel')}</span>}
          htmlFor="create-title"
          error={fieldErrors.title}
          className={nightStyles.fieldBare}
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
                if (event.key === 'Enter') void handleSubmit();
              }}
              maxLength={200}
              placeholder={t('events.create.titlePlaceholder')}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
            />
          )}
        </Field>
      </div>
      <NightThemeField
        inputId="create-theme"
        emoji={fields.themeEmoji}
        text={fields.themeText}
        onChange={(themeEmoji, themeText) => updateFields({ themeEmoji, themeText })}
      />
      <NightGroupField
        groups={myGroups}
        groupId={chosenGroup?.id ?? null}
        onChange={setPickedGroupId}
        note={chosenGroup ? <GroupNote group={chosenGroup} t={t} /> : null}
      />
    </>
  );

  const templates = eventTemplates.templates;
  const nights = distinctNights([reuse, lastNight]);

  const rulesPanel = (
    <NightRules
      idPrefix="create"
      fields={fields}
      caps={limitCaps}
      errors={fieldErrors}
      onChange={updateFields}
      showTitle={!isMobile}
      titleAction={
        templates.length > 0 ? (
          <ManageTemplatesButton
            managing={managing}
            disabled={eventTemplates.isBusy}
            onManagingChange={setManaging}
          />
        ) : undefined
      }
      start={
        <NightRuleStarts
          defaultsSelected={rules.kind === 'defaults'}
          nights={nights}
          selectedNightSlug={rules.kind === 'night' ? rules.slug : null}
          templates={templates}
          selectedTemplateId={rules.kind === 'template' ? rules.template.id : null}
          onChoose={chooseRules}
          managing={managing}
          onManagingChange={setManaging}
          busy={eventTemplates.isBusy}
          onRename={eventTemplates.rename}
          onDelete={eventTemplates.remove}
        />
      }
      end={
        <>
          <EventTemplateSaveBar
            draft={draft}
            templates={templates}
            appliedTemplate={eventTemplates.appliedTemplate}
            lastSaved={eventTemplates.lastSaved}
            disabled={eventTemplates.isBusy}
            hidden={rules.kind === 'defaults' || matchesSavedTemplate}
            onBeforeSave={limitsAreValid}
            onSave={saveTemplate}
            onUpdate={eventTemplates.updateApplied}
          />
          {templateError ? (
            <p className="error" role="alert">
              {templateError}
            </p>
          ) : null}
        </>
      }
    />
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={requestClose}
      title={t('events.create.title')}
      size="xl"
      sheetSize="lg"
      bodyClassName={bodyClassName}
      footer={
        <div className={nightStyles.footer}>
          {error ? (
            <p className={clsx('error', nightStyles.footerError)} role="alert">
              {error}
            </p>
          ) : null}
          <span className={nightStyles.footerSpacer} />
          <Button variant="primary" loading={loading} onClick={() => void handleSubmit()}>
            {loading ? t('events.create.submitting') : t('events.create.submit')}
          </Button>
        </div>
      }
    >
      <NightFormLayout
        main={main}
        rules={rulesPanel}
        rulesSummary={rulesLabel(rules, t)}
        rulesError={firstRuleError('create', fieldErrors)?.message}
        rulesOpen={rulesOpen}
        onRulesOpenChange={setRulesOpen}
      />
    </ResponsiveDialog>
  );
}
