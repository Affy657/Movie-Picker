import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import clsx from 'clsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Settings2, Sparkles } from 'lucide-react';
import ThemeField from '@/features/events/components/ThemeField';
import WheelModeField from '@/features/events/components/WheelModeField';
import EventTemplatesRow from '@/features/events/components/EventTemplatesRow';
import EventTemplateSaveBar from '@/features/events/components/EventTemplateSaveBar';
import { useEventTemplates } from '@/features/events/hooks/useEventTemplates';
import {
  buildTemplateDraft,
  configToFields,
  draftToConfigPatch,
  type ApplicableConfig,
} from '@/features/events/lib/eventTemplateDraft';
import NumberInput from '@/shared/components/NumberInput';
import Toggle from '@/shared/components/Toggle';
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
import { setStoredParticipant } from '@/features/events/storage';
import { ROUTES } from '@/app/routes';
import {
  DEFAULT_EVENT_CONFIG,
  DEFAULT_VOTE_LIMIT,
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
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';

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

  useEffect(() => {
    if (!titleEdited.current) setTitle(suggestedTitle);
  }, [suggestedTitle]);
  const [themeEmoji, setThemeEmoji] = useState('');
  const [themeText, setThemeText] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(String(MAX_EVENT_PARTICIPANTS));
  const [maxProposals, setMaxProposals] = useState(String(MAX_PROPOSALS_PER_PARTICIPANT));
  const [voteLimitEnabled, setVoteLimitEnabled] = useState(false);
  const [maxVotes, setMaxVotes] = useState(String(DEFAULT_VOTE_LIMIT));
  const [winnerCount, setWinnerCount] = useState(String(DEFAULT_EVENT_CONFIG.winnerCount));
  const [wheelMode, setWheelMode] = useState<WheelMode>(DEFAULT_EVENT_CONFIG.wheelMode);
  const [allowSeries, setAllowSeries] = useState(DEFAULT_EVENT_CONFIG.allowSeries ?? false);
  const [richSharePreview, setRichSharePreview] = useState(
    DEFAULT_EVENT_CONFIG.richSharePreview ?? true
  );
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const applyConfig = useCallback((config: ApplicableConfig) => {
    const fields = configToFields(config);
    setThemeEmoji(fields.themeEmoji);
    setThemeText(fields.themeText);
    setMaxProposals(fields.maxProposals);
    setMaxParticipants(fields.maxParticipants);
    setVoteLimitEnabled(fields.voteLimitEnabled);
    setMaxVotes(fields.maxVotes);
    setWheelMode(fields.wheelMode);
    setRichSharePreview(fields.richSharePreview);
    setAllowSeries(fields.allowSeries);
    setWinnerCount(fields.winnerCount);
    setAdvancedOpen(true);
  }, []);

  const templateDraft = buildTemplateDraft({
    themeEmoji,
    themeText,
    maxProposals,
    maxParticipants,
    voteLimitEnabled,
    maxVotes,
    wheelMode,
    richSharePreview,
    allowSeries,
    winnerCount,
  });
  const eventTemplates = useEventTemplates(!!user, {
    draft: templateDraft,
    onError: setTemplateError,
    onApply: applyConfig,
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
  const [reusedFrom, setReusedFrom] = useState<string | null>(null);
  useEffect(() => {
    if (!reusedConfig || reusedConfigApplied.current) return;
    reusedConfigApplied.current = true;
    applyConfig(reusedConfig);
    setReusedFrom(reuseState?.reuseEventTitle ?? '');
  }, [reusedConfig, applyConfig, reuseState?.reuseEventTitle]);

  const configPatch = draftToConfigPatch(templateDraft);
  const createAction = useCallback(async () => {
    const res = await createEventApi({ title, date, time });
    track('event_created');
    const publicUrl = `${globalThis.location.origin}${ROUTES.eventDetail(res.slug)}`;
    if (res.creatorParticipant) {
      setStoredParticipant(res.slug, res.creatorParticipant.id, res.creatorParticipant.pseudo);
    }

    try {
      await patchEventConfig(res.slug, null, configPatch);
    } catch {}

    queryClient.invalidateQueries({ queryKey: queryKeys.myEvents.list });
    navigate(ROUTES.eventDetail(res.slug), {
      state: { shareUrl: publicUrl, justCreated: true },
    });
  }, [title, date, time, configPatch, queryClient, navigate, track]);

  const {
    run: submit,
    loading,
    error,
  } = useAsyncAction(createAction, t('events.create.fallbackError'));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit();
  };

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
        <ArrowLeft size={16} aria-hidden />
        <span className={styles.backLinkLabel}>{t('nav.myEvents')}</span>
      </Link>
      <Card padding="none" radius="lg" elevation="md" className={styles.card}>
        <span className={styles.cardAccent} aria-hidden />
        <h1 className={styles.title}>{t('events.create.title')}</h1>
        <p className={styles.description}>{t('events.create.description')}</p>
        <form onSubmit={handleSubmit} className="form">
          {(error ?? templateError) && (
            <p className="error" role="alert">
              {error ?? templateError}
            </p>
          )}

          <label className="label" htmlFor="create-title">
            {t('events.create.titleLabel')}
          </label>
          <input
            id="create-title"
            type="text"
            className="input"
            value={title}
            onChange={(e) => {
              titleEdited.current = true;
              setTitle(e.target.value);
            }}
            required
            maxLength={200}
            placeholder={t('events.create.titlePlaceholder')}
          />
          <div className={styles.fieldGrid}>
            <div>
              <label className="label" htmlFor="create-date">
                {t('events.create.dateLabel')}
              </label>
              <input
                id="create-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="create-time">
                {t('events.create.timeLabel')}
              </label>
              <input
                id="create-time"
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <EventTemplatesRow
            className={styles.templatesRow}
            templates={eventTemplates.templates}
            appliedTemplate={eventTemplates.matchingTemplate}
            disabled={eventTemplates.isBusy || loading}
            onApply={eventTemplates.apply}
            onRename={eventTemplates.rename}
            onDelete={eventTemplates.remove}
          />

          {reusedFrom !== null && (
            <p className={styles.reused} role="status">
              <Sparkles size={14} aria-hidden />
              <span className={styles.reusedLabel}>
                {reusedFrom.length > 0
                  ? t('events.settings.templates.reusedFrom', { title: reusedFrom })
                  : t('events.settings.templates.reusedFromUnnamed')}
              </span>
            </p>
          )}

          <details
            className={styles.advanced}
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen(e.currentTarget.open)}
          >
            <summary className={styles.advancedSummary}>
              <Settings2 size={16} aria-hidden className={styles.advancedIcon} />
              <span className={styles.advancedLabel}>{t('events.create.advancedOptions')}</span>
              <span className={styles.advancedChevron} aria-hidden />
            </summary>
            <div className={styles.advancedBody}>
              <label className="label" htmlFor="create-theme">
                {t('events.settings.themeLabel')}
              </label>
              <ThemeField
                textInputId="create-theme"
                emoji={themeEmoji}
                text={themeText}
                onEmojiChange={setThemeEmoji}
                onTextChange={setThemeText}
              />

              <div className={clsx(styles.fieldGrid, styles.counterGrid)}>
                <div>
                  <label className="label" htmlFor="create-max-proposals">
                    {t('events.settings.maxProposalsLabel')}
                  </label>
                  <NumberInput
                    id="create-max-proposals"
                    value={maxProposals}
                    onChange={setMaxProposals}
                    min={1}
                    max={MAX_PROPOSALS_PER_PARTICIPANT}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="create-max-participants">
                    {t('events.settings.maxParticipantsLabel')}
                  </label>
                  <NumberInput
                    id="create-max-participants"
                    value={maxParticipants}
                    onChange={setMaxParticipants}
                    min={1}
                    max={MAX_EVENT_PARTICIPANTS}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="create-winner-count">
                    {t('events.settings.winnerCountLabel')}
                  </label>
                  <NumberInput
                    id="create-winner-count"
                    value={winnerCount}
                    onChange={setWinnerCount}
                    min={1}
                    max={MAX_WINNERS_PER_EVENT}
                  />
                  <p className="hint">
                    {t('events.settings.winnerCountHint', { max: MAX_WINNERS_PER_EVENT })}
                  </p>
                </div>
              </div>

              <div className={styles.field}>
                <span className="label" id={wheelModeLabelId}>
                  {t('events.settings.wheelModeLabel')}
                </span>
                <WheelModeField
                  name="create-wheel-mode"
                  value={wheelMode}
                  labelId={wheelModeLabelId}
                  onChange={setWheelMode}
                />
              </div>

              <div className={styles.toggleRow}>
                <span>
                  <span className={styles.toggleName}>{t('events.settings.allowSeriesLabel')}</span>
                  <span className={styles.toggleDesc}>{t('events.settings.allowSeriesDesc')}</span>
                </span>
                <Toggle
                  checked={allowSeries}
                  label={t('events.settings.allowSeriesLabel')}
                  onChange={() => setAllowSeries((v) => !v)}
                />
              </div>

              <div className={styles.toggleRow}>
                <span>
                  <span className={styles.toggleName}>{t('events.settings.voteLimitLabel')}</span>
                  <span className={styles.toggleDesc}>{t('events.settings.voteLimitDesc')}</span>
                </span>
                <Toggle
                  checked={voteLimitEnabled}
                  label={t('events.settings.voteLimitLabel')}
                  onChange={() => setVoteLimitEnabled((v) => !v)}
                />
              </div>
              {voteLimitEnabled && (
                <div className={styles.subField}>
                  <label className="label" htmlFor="create-max-votes">
                    {t('events.settings.maxVotesLabel')}
                  </label>
                  <NumberInput
                    id="create-max-votes"
                    value={maxVotes}
                    onChange={setMaxVotes}
                    min={1}
                  />
                </div>
              )}

              <EventTemplateSaveBar
                draft={templateDraft}
                templates={eventTemplates.templates}
                appliedTemplate={eventTemplates.appliedTemplate}
                lastSaved={eventTemplates.lastSaved}
                disabled={eventTemplates.isBusy || loading}
                onSave={eventTemplates.saveAs}
                onUpdate={eventTemplates.updateApplied}
              />
            </div>
          </details>

          <Button type="submit" variant="primary" className={styles.submit} loading={loading}>
            {loading ? t('events.create.submitting') : t('events.create.submit')}
          </Button>
        </form>
      </Card>
    </PageLayout>
  );
}
