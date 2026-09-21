import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, ListRestart, Settings2, Sparkles } from 'lucide-react';
import ThemeField from '@/features/events/components/ThemeField';
import WheelModeField from '@/features/events/components/WheelModeField';
import EventTemplatesRow from '@/features/events/components/EventTemplatesRow';
import EventTemplateSaveBar from '@/features/events/components/EventTemplateSaveBar';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  defaultTemplateFields,
  draftToConfigPatch,
  isDefaultTemplateDraft,
  limitFieldOnEnable,
  type ApplicableConfig,
  type TemplateFormFields,
} from '@/features/events/lib/eventTemplateDraft';
import { describeTemplateConfig } from '@/features/events/lib/describeTemplateConfig';
import {
  isPastEventDateTime,
  validateCreateEventDraft,
  type CreateEventFieldErrors,
} from '@/features/events/lib/createEventValidation';
import NumberInput from '@/shared/components/NumberInput';
import ToggleRow from '@/shared/components/ToggleRow';
import PageLayout from '@/shared/components/PageLayout';
import {
  createEvent as createEventApi,
  fetchEventConfig,
  patchEventConfig,
} from '@/features/events/api/eventsApi';
import { pageTitle } from '@/shared/hooks/useDocumentTitle';
import { useNoindexPage } from '@/shared/hooks/usePageSeo';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { setStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { ROUTES } from '@/app/routes';
import {
  DEFAULT_PARTICIPANT_LIMIT,
  DEFAULT_PROPOSAL_LIMIT,
  MAX_EVENT_PARTICIPANTS,
  MAX_PROPOSALS_PER_PARTICIPANT,
  MAX_WINNERS_PER_EVENT,
} from '@/features/events/types';
import type { WheelMode } from '@/features/events/types';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { useAnalytics } from '@/shared/hooks/useAnalytics';
import { useLocale, useTranslation } from '@/shared/i18n';
import { formatEventTitleDate } from '@/shared/utils/formatMyEventsListDate';
import styles from './CreateEvent.module.css';
import templatesStyles from '@/features/events/components/EventTemplatesSection.module.css';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Field from '@/shared/components/Field';

function getDefaultDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultTime(): string {
  const now = new Date();
  const totalMin = now.getHours() * 60 + now.getMinutes();
  if (totalMin < 20 * 60) return '20:00';
  const ceil = Math.ceil(totalMin / 30) * 30;
  const h = Math.floor(ceil / 60) % 24;
  const m = ceil % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const INITIAL_FIELDS = defaultTemplateFields();

export default function CreateEvent() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  useNoindexPage(pageTitle(t('nav.createEvent')), ROUTES.createEvent);
  const wheelModeLabelId = useId();

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const { track } = useAnalytics();
  const [date, setDate] = useState(getDefaultDate);
  const [time, setTime] = useState(getDefaultTime);
  const suggestedTitle = t('events.create.defaultTitle', {
    date: formatEventTitleDate(date, locale),
  });
  const [title, setTitle] = useState(suggestedTitle);
  const titleEdited = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<CreateEventFieldErrors>({});

  useEffect(() => {
    if (!titleEdited.current) setTitle(suggestedTitle);
  }, [suggestedTitle]);
  const [themeEmoji, setThemeEmoji] = useState(INITIAL_FIELDS.themeEmoji);
  const [themeText, setThemeText] = useState(INITIAL_FIELDS.themeText);
  const [participantLimitEnabled, setParticipantLimitEnabled] = useState(
    INITIAL_FIELDS.participantLimitEnabled
  );
  const [maxParticipants, setMaxParticipants] = useState(INITIAL_FIELDS.maxParticipants);
  const [proposalLimitEnabled, setProposalLimitEnabled] = useState(
    INITIAL_FIELDS.proposalLimitEnabled
  );
  const [maxProposals, setMaxProposals] = useState(INITIAL_FIELDS.maxProposals);
  const [voteLimitEnabled, setVoteLimitEnabled] = useState(INITIAL_FIELDS.voteLimitEnabled);
  const [maxVotes, setMaxVotes] = useState(INITIAL_FIELDS.maxVotes);
  const [winnerCount, setWinnerCount] = useState(INITIAL_FIELDS.winnerCount);
  const [wheelMode, setWheelMode] = useState<WheelMode>(INITIAL_FIELDS.wheelMode);
  const [allowSeries, setAllowSeries] = useState(INITIAL_FIELDS.allowSeries);
  const [richSharePreview, setRichSharePreview] = useState(INITIAL_FIELDS.richSharePreview);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyFields = useCallback((fields: TemplateFormFields) => {
    setThemeEmoji(fields.themeEmoji);
    setThemeText(fields.themeText);
    setProposalLimitEnabled(fields.proposalLimitEnabled);
    setMaxProposals(fields.maxProposals);
    setParticipantLimitEnabled(fields.participantLimitEnabled);
    setMaxParticipants(fields.maxParticipants);
    setVoteLimitEnabled(fields.voteLimitEnabled);
    setMaxVotes(fields.maxVotes);
    setWheelMode(fields.wheelMode);
    setRichSharePreview(fields.richSharePreview);
    setAllowSeries(fields.allowSeries);
    setWinnerCount(fields.winnerCount);
  }, []);

  const applyConfig = useCallback(
    (config: ApplicableConfig) => applyFields(configToFields(config)),
    [applyFields]
  );

  const templateDraft = buildTemplateDraft({
    themeEmoji,
    themeText,
    proposalLimitEnabled,
    maxProposals,
    participantLimitEnabled,
    maxParticipants,
    voteLimitEnabled,
    maxVotes,
    wheelMode,
    richSharePreview,
    allowSeries,
    winnerCount,
  });
  const optionsAreDefault = isDefaultTemplateDraft(templateDraft);
  const optionsSummary = describeTemplateConfig(templateDraft, t);
  const [reusedFrom, setReusedFrom] = useState<string | null>(null);
  const eventTemplates = useEventTemplates(!!user, {
    draft: templateDraft,
    onError: setTemplateError,
    onApply: (template) => {
      applyConfig(template);
      setReusedFrom(null);
    },
  });

  const reuseState = location.state as { reuseEventSlug?: string; reuseEventTitle?: string } | null;
  const reuseEventSlug = reuseState?.reuseEventSlug;
  const reusedConfigQuery = useQuery({
    queryKey: queryKeys.event.reusableConfig(reuseEventSlug),
    queryFn: () => fetchEventConfig(reuseEventSlug!),
    enabled: !!reuseEventSlug && !!user,
  });

  const reusedConfig = reusedConfigQuery.data;
  const reusedConfigApplied = useRef(false);
  useEffect(() => {
    if (!reusedConfig || reusedConfigApplied.current) return;
    reusedConfigApplied.current = true;
    applyConfig(reusedConfig);
    setReusedFrom(reuseState?.reuseEventTitle ?? '');
  }, [reusedConfig, applyConfig, reuseState?.reuseEventTitle]);

  const forgetAppliedTemplate = eventTemplates.forget;
  const resetOptions = useCallback(() => {
    applyFields(defaultTemplateFields());
    forgetAppliedTemplate();
    setReusedFrom(null);
  }, [applyFields, forgetAppliedTemplate]);

  const configPatch = draftToConfigPatch(templateDraft);
  const createAction = useCallback(async () => {
    const res = await createEventApi({ title, date, time });
    track('event_created');
    const publicUrl = `${globalThis.location.origin}${ROUTES.eventDetail(res.slug)}`;
    if (res.creatorParticipant) {
      setStoredParticipant(res.slug, res.creatorParticipant.id, res.creatorParticipant.pseudo);
    }

    let configNotSaved = false;
    try {
      await patchEventConfig(res.slug, null, configPatch);
    } catch {
      configNotSaved = true;
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    navigate(ROUTES.eventDetail(res.slug), {
      state: { shareUrl: publicUrl, justCreated: true, configNotSaved },
    });
  }, [title, date, time, configPatch, queryClient, navigate, track]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(createAction, t('events.create.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateCreateEventDraft({ title, date, time }, t);
    setFieldErrors(errors);
    const firstInvalid = [
      { message: errors.title, ref: titleRef },
      { message: errors.date, ref: dateRef },
      { message: errors.time, ref: timeRef },
    ].find((entry) => entry.message !== undefined);
    if (firstInvalid) {
      firstInvalid.ref.current?.focus();
      return;
    }
    void submit();
  };

  const pastDateHint = isPastEventDateTime(date, time, new Date())
    ? t('events.create.pastDateHint')
    : undefined;
  const showTemplates =
    eventTemplates.templates.length > 0 || !optionsAreDefault || reusedFrom !== null;

  if (authLoading) {
    return (
      <PageLayout className={styles.layout}>
        <p className="placeholder">{t('common.loading')}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout className={styles.layout}>
      <Link to={ROUTES.myEvents} className={styles.backLink}>
        <ArrowLeft size={ICON_SIZE.md} aria-hidden />
        <span className={styles.backLinkLabel}>{t('nav.myEvents')}</span>
      </Link>
      <Card padding="none" radius="lg" elevation="md" className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>{t('events.create.title')}</h1>
        <p className={styles.description}>{t('events.create.description')}</p>
        <form onSubmit={handleSubmit} className="form" noValidate>
          <Field
            label={t('events.create.titleLabel')}
            htmlFor="create-title"
            error={fieldErrors.title}
          >
            {({ id, describedBy, invalid }) => (
              <input
                ref={titleRef}
                id={id}
                type="text"
                className="input"
                value={title}
                onChange={(e) => {
                  titleEdited.current = true;
                  setTitle(e.target.value);
                  setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                required
                maxLength={200}
                placeholder={t('events.create.titlePlaceholder')}
                aria-invalid={invalid || undefined}
                aria-describedby={describedBy}
              />
            )}
          </Field>
          <div className={styles.fieldGrid}>
            <Field
              label={t('events.create.dateLabel')}
              htmlFor="create-date"
              error={fieldErrors.date}
              hint={pastDateHint ? <span className={styles.pastHint}>{pastDateHint}</span> : null}
            >
              {({ id, describedBy, invalid }) => (
                <input
                  ref={dateRef}
                  id={id}
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setFieldErrors((current) => ({ ...current, date: undefined }));
                  }}
                  required
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
            <Field
              label={t('events.create.timeLabel')}
              htmlFor="create-time"
              error={fieldErrors.time}
            >
              {({ id, describedBy, invalid }) => (
                <input
                  ref={timeRef}
                  id={id}
                  type="time"
                  className="input"
                  value={time}
                  onChange={(e) => {
                    setTime(e.target.value);
                    setFieldErrors((current) => ({ ...current, time: undefined }));
                  }}
                  required
                  aria-invalid={invalid || undefined}
                  aria-describedby={describedBy}
                />
              )}
            </Field>
          </div>

          <details
            className={styles.advanced}
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
          >
            <summary className={styles.advancedSummary}>
              <Settings2 size={ICON_SIZE.md} aria-hidden className={styles.advancedIcon} />
              <span className={styles.advancedLabel}>{t('events.create.advancedOptions')}</span>
              <ChevronDown size={ICON_SIZE.md} aria-hidden className={styles.advancedChevron} />
            </summary>
            <div className={styles.advancedBody}>
              <section className={styles.group}>
                <h2 className={styles.groupTitle}>{t('events.create.sectionTheme')}</h2>
                <Field
                  label={t('events.create.themeLabel')}
                  htmlFor="create-theme"
                  className={styles.groupField}
                >
                  {({ id }) => (
                    <ThemeField
                      textInputId={id}
                      emoji={themeEmoji}
                      text={themeText}
                      onEmojiChange={setThemeEmoji}
                      onTextChange={setThemeText}
                    />
                  )}
                </Field>
              </section>

              <section className={styles.group}>
                <h2 className={styles.groupTitle}>{t('events.settings.sectionParticipants')}</h2>
                <div>
                  <ToggleRow
                    title={t('events.settings.participantLimitLabel')}
                    description={t('events.settings.participantLimitDesc', {
                      max: MAX_EVENT_PARTICIPANTS,
                    })}
                    checked={participantLimitEnabled}
                    onChange={(checked) => {
                      setParticipantLimitEnabled(checked);
                      if (checked)
                        setMaxParticipants((current) =>
                          limitFieldOnEnable(
                            current,
                            MAX_EVENT_PARTICIPANTS,
                            DEFAULT_PARTICIPANT_LIMIT
                          )
                        );
                    }}
                  />
                  {participantLimitEnabled && (
                    <Field
                      label={t('events.settings.maxParticipantsLabel')}
                      htmlFor="create-max-participants"
                      hint={t('events.settings.maxParticipantsCapHint', {
                        max: MAX_EVENT_PARTICIPANTS,
                      })}
                      className={clsx(styles.subField, styles.counterField)}
                    >
                      {({ id, describedBy }) => (
                        <NumberInput
                          id={id}
                          value={maxParticipants}
                          onChange={setMaxParticipants}
                          min={1}
                          max={MAX_EVENT_PARTICIPANTS}
                          ariaDescribedBy={describedBy}
                        />
                      )}
                    </Field>
                  )}
                </div>
                <div>
                  <ToggleRow
                    title={t('events.settings.proposalLimitLabel')}
                    description={t('events.settings.proposalLimitDesc', {
                      max: MAX_PROPOSALS_PER_PARTICIPANT,
                    })}
                    checked={proposalLimitEnabled}
                    onChange={(checked) => {
                      setProposalLimitEnabled(checked);
                      if (checked)
                        setMaxProposals((current) =>
                          limitFieldOnEnable(
                            current,
                            MAX_PROPOSALS_PER_PARTICIPANT,
                            DEFAULT_PROPOSAL_LIMIT
                          )
                        );
                    }}
                  />
                  {proposalLimitEnabled && (
                    <Field
                      label={t('events.settings.maxProposalsLabel')}
                      htmlFor="create-max-proposals"
                      hint={t('events.settings.maxProposalsHint', {
                        max: MAX_PROPOSALS_PER_PARTICIPANT,
                      })}
                      className={clsx(styles.subField, styles.counterField)}
                    >
                      {({ id, describedBy }) => (
                        <NumberInput
                          id={id}
                          value={maxProposals}
                          onChange={setMaxProposals}
                          min={1}
                          max={MAX_PROPOSALS_PER_PARTICIPANT}
                          ariaDescribedBy={describedBy}
                        />
                      )}
                    </Field>
                  )}
                </div>
                <ToggleRow
                  title={t('events.settings.allowSeriesLabel')}
                  description={t('events.settings.allowSeriesDesc')}
                  checked={allowSeries}
                  onChange={setAllowSeries}
                />
              </section>

              <section className={styles.group}>
                <h2 className={styles.groupTitle}>{t('events.settings.sectionDraw')}</h2>
                <div>
                  <ToggleRow
                    title={t('events.settings.voteLimitLabel')}
                    description={t('events.settings.voteLimitDesc')}
                    checked={voteLimitEnabled}
                    onChange={setVoteLimitEnabled}
                  />
                  {voteLimitEnabled && (
                    <Field
                      label={t('events.settings.maxVotesLabel')}
                      htmlFor="create-max-votes"
                      className={clsx(styles.subField, styles.counterField)}
                    >
                      {({ id }) => (
                        <NumberInput id={id} value={maxVotes} onChange={setMaxVotes} min={1} />
                      )}
                    </Field>
                  )}
                </div>
                <div className={styles.groupField}>
                  <span className="label" id={wheelModeLabelId}>
                    {t('events.settings.wheelModeLabel')}
                  </span>
                  <WheelModeField
                    value={wheelMode}
                    labelId={wheelModeLabelId}
                    onChange={setWheelMode}
                  />
                </div>
                <Field
                  label={t('events.settings.winnerCountLabel')}
                  htmlFor="create-winner-count"
                  hint={t('events.settings.winnerCountHint', { max: MAX_WINNERS_PER_EVENT })}
                  className={clsx(styles.groupField, styles.counterField)}
                >
                  {({ id, describedBy }) => (
                    <NumberInput
                      id={id}
                      value={winnerCount}
                      onChange={setWinnerCount}
                      min={1}
                      max={MAX_WINNERS_PER_EVENT}
                      ariaDescribedBy={describedBy}
                    />
                  )}
                </Field>
              </section>

              {!optionsAreDefault && (
                <div className={styles.resetRow}>
                  <Button variant="ghost" size="sm" onClick={resetOptions}>
                    <ListRestart size={ICON_SIZE.sm} aria-hidden />
                    <span className={styles.resetLabel}>{t('events.create.resetOptions')}</span>
                  </Button>
                </div>
              )}
            </div>
          </details>

          {showTemplates && (
            <section className={clsx(styles.templatesSection, templatesStyles.section)}>
              {templateError && (
                <p className="error" role="alert">
                  {templateError}
                </p>
              )}
              {reusedFrom !== null && (
                <output className={styles.reused}>
                  <Sparkles size={ICON_SIZE.sm} aria-hidden />
                  <span className={styles.reusedLabel}>
                    {reusedFrom.length > 0
                      ? t('events.settings.templates.reusedFrom', { title: reusedFrom })
                      : t('events.settings.templates.reusedFromUnnamed')}{' '}
                    {optionsSummary}.
                  </span>
                </output>
              )}
              <EventTemplatesRow
                className={templatesStyles.row}
                templates={eventTemplates.templates}
                appliedTemplate={eventTemplates.matchingTemplate}
                appliedSummary={optionsSummary}
                disabled={eventTemplates.isBusy || loading}
                onApply={eventTemplates.apply}
                onClear={resetOptions}
                onRename={eventTemplates.rename}
                onDelete={eventTemplates.remove}
              />
              <EventTemplateSaveBar
                className={templatesStyles.saveBar}
                draft={templateDraft}
                templates={eventTemplates.templates}
                appliedTemplate={eventTemplates.appliedTemplate}
                lastSaved={eventTemplates.lastSaved}
                disabled={eventTemplates.isBusy || loading}
                onSave={eventTemplates.saveAs}
                onUpdate={eventTemplates.updateApplied}
              />
            </section>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className={styles.submit} loading={loading}>
            {loading ? t('events.create.submitting') : t('events.create.submit')}
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}
