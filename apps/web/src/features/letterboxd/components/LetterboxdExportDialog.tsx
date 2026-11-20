import { useRef, useState, type ReactNode } from 'react';
import { Check, ExternalLink, FileUp } from 'lucide-react';
import LetterboxdChoicesModal from '@/features/letterboxd/components/LetterboxdChoicesModal';
import {
  useLetterboxdExportImport,
  type ExportTargets,
  type LetterboxdExportReport,
  type ListTally,
} from '@/features/letterboxd/hooks/useLetterboxdExportImport';
import type { LetterboxdExport } from '@/features/letterboxd/api/letterboxdApi';
import { LETTERBOXD_MAX_CHOICES } from '@/features/letterboxd/utils/syncReport';
import Button, { buttonClass } from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { ICON_SIZE } from '@/shared/components/iconSize';
import LinkButton from '@/shared/components/LinkButton';
import { ModalActions } from '@/shared/components/Modal';
import ProgressBar from '@/shared/components/ProgressBar';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import ToggleRow from '@/shared/components/ToggleRow';
import { useTranslation, type Translate } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';
import styles from './LetterboxdExportDialog.module.css';

const LETTERBOXD_EXPORT_PAGE = 'https://letterboxd.com/settings/data/';
const ACCEPTED_FILES = '.zip,.csv,application/zip,text/csv';

function ChooseStep({
  error,
  onFiles,
}: Readonly<{ error: string | null; onFiles: (files: File[]) => void }>) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <ol className={styles.steps}>
        <li>
          <p className={styles.stepText}>{t('auth.account.letterboxd.export.stepExport')}</p>
          <a
            href={LETTERBOXD_EXPORT_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ size: 'sm' })}
          >
            <ExternalLink size={ICON_SIZE.sm} aria-hidden />
            {t('auth.account.letterboxd.export.exportLink')}
          </a>
        </li>
        <li>
          <p className={styles.stepText}>{t('auth.account.letterboxd.export.stepFile')}</p>
          <input
            ref={input}
            type="file"
            accept={ACCEPTED_FILES}
            multiple
            className="visually-hidden"
            aria-label={t('auth.account.letterboxd.export.chooseFile')}
            onChange={(event) => onFiles([...(event.target.files ?? [])])}
          />
          <Button size="sm" variant="primary" onClick={() => input.current?.click()}>
            <FileUp size={ICON_SIZE.sm} aria-hidden />
            {t('auth.account.letterboxd.export.chooseFile')}
          </Button>
          <p className={styles.hint}>{t('auth.account.letterboxd.export.unzippedHint')}</p>
        </li>
      </ol>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function SummaryStep({
  exported,
  targets,
  onChange,
}: Readonly<{
  exported: LetterboxdExport;
  targets: ExportTargets;
  onChange: (targets: ExportTargets) => void;
}>) {
  const { t } = useTranslation();
  if (exported.watched.length + exported.watchlist.length === 0)
    return <p className={styles.lead}>{t('auth.account.letterboxd.export.nothingFound')}</p>;
  return (
    <>
      <p className={styles.lead}>{t('auth.account.letterboxd.export.found')}</p>
      <div className={styles.targets}>
        {exported.watched.length > 0 && (
          <ToggleRow
            title={t('watched.title')}
            description={pluralizeCount(
              exported.watched.length,
              'auth.account.letterboxd.export.filmsOne',
              'auth.account.letterboxd.export.films',
              t
            )}
            checked={targets.watched}
            onChange={(watched) => onChange({ ...targets, watched })}
          />
        )}
        {exported.watchlist.length > 0 && (
          <ToggleRow
            title={t('watchlist.title')}
            description={pluralizeCount(
              exported.watchlist.length,
              'auth.account.letterboxd.export.filmsOne',
              'auth.account.letterboxd.export.films',
              t
            )}
            checked={targets.watchlist}
            onChange={(watchlist) => onChange({ ...targets, watchlist })}
          />
        )}
      </div>
      <p className={styles.hint}>{t('auth.account.letterboxd.export.noDuplicate')}</p>
    </>
  );
}

function TallyLine({
  label,
  tally,
  t,
}: Readonly<{ label: string; tally: ListTally; t: Translate }>) {
  return (
    <p className={styles.tally}>
      <span className={styles.tallyIcon}>
        <Check size={ICON_SIZE.sm} aria-hidden />
      </span>
      <span>
        {t('auth.account.letterboxd.export.tally', {
          list: label,
          added: String(tally.added),
          already: String(tally.alreadyPresent),
        })}
      </span>
    </p>
  );
}

function outcomeLine(report: LetterboxdExportReport, t: Translate): string {
  const counts = { done: String(report.done), total: String(report.total) };
  if (report.outcome === 'stopped') return t('auth.account.letterboxd.export.stopped', counts);
  if (report.outcome === 'failed') return t('auth.account.letterboxd.export.failed', counts);
  return pluralizeCount(
    report.total,
    'auth.account.letterboxd.export.finishedOne',
    'auth.account.letterboxd.export.finished',
    t
  );
}

function DoneStep({
  report,
  onChoose,
}: Readonly<{ report: LetterboxdExportReport; onChoose: () => void }>) {
  const { t } = useTranslation();
  const unmatched = [...new Set(report.unmatched)];
  return (
    <>
      <p className={report.outcome === 'finished' ? styles.lead : styles.error} role="status">
        {outcomeLine(report, t)}
      </p>
      <Card padding="none" surface="sunken" className={styles.report}>
        {report.watched && <TallyLine label={t('watched.title')} tally={report.watched} t={t} />}
        {report.watchlist && (
          <TallyLine label={t('watchlist.title')} tally={report.watchlist} t={t} />
        )}
        {report.pending.length > 0 && (
          <LinkButton size="sm" className={styles.reportAction} onClick={onChoose}>
            {t('auth.account.letterboxd.reportPending', { count: String(report.pending.length) })}
          </LinkButton>
        )}
        {unmatched.length > 0 && (
          <details className={styles.unmatched}>
            <summary>
              {t('auth.account.letterboxd.reportUnmatched', { count: String(unmatched.length) })}
            </summary>
            <ul className={styles.unmatchedList}>
              {unmatched.map((title) => (
                <li key={title}>{title}</li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </>
  );
}

const ALL_TARGETS: ExportTargets = { watched: true, watchlist: true };

export default function LetterboxdExportDialog({ onClose }: Readonly<{ onClose: () => void }>) {
  const { t } = useTranslation();
  const flow = useLetterboxdExportImport();
  const [targets, setTargets] = useState<ExportTargets>(ALL_TARGETS);
  const [choosing, setChoosing] = useState(false);
  const { step } = flow;

  if (choosing && step.kind === 'done') {
    return (
      <LetterboxdChoicesModal
        open
        fromExport
        choices={step.report.pending.slice(0, LETTERBOXD_MAX_CHOICES)}
        onClose={() => setChoosing(false)}
        onConfirmed={(result, unresolved) => {
          flow.confirmed(result, [
            ...unresolved,
            ...step.report.pending.slice(LETTERBOXD_MAX_CHOICES),
          ]);
          setChoosing(false);
        }}
      />
    );
  }

  const close = () => {
    flow.stop();
    onClose();
  };
  let body: ReactNode = null;
  let footer: ReactNode = null;
  switch (step.kind) {
    case 'choose':
      body = <ChooseStep error={step.error} onFiles={(files) => void flow.read(files)} />;
      footer = <Button onClick={close}>{t('common.cancel')}</Button>;
      break;
    case 'reading':
      body = <p className={styles.lead}>{t('auth.account.letterboxd.export.reading')}</p>;
      footer = <Button onClick={close}>{t('common.cancel')}</Button>;
      break;
    case 'summary': {
      const chosen =
        (targets.watched && step.exported.watched.length > 0) ||
        (targets.watchlist && step.exported.watchlist.length > 0);
      body = <SummaryStep exported={step.exported} targets={targets} onChange={setTargets} />;
      footer = (
        <>
          <Button onClick={close}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            disabled={!chosen}
            onClick={() => void flow.start(step.exported, targets)}
          >
            {t('auth.account.letterboxd.export.start')}
          </Button>
        </>
      );
      break;
    }
    case 'importing':
      body = (
        <>
          <ProgressBar
            value={step.total > 0 ? (step.done / step.total) * 100 : 0}
            label={t('auth.account.letterboxd.export.progress', {
              done: String(step.done),
              total: String(step.total),
            })}
          />
          <p className={styles.hint}>{t('auth.account.letterboxd.export.keepOpen')}</p>
        </>
      );
      footer = <Button onClick={flow.stop}>{t('auth.account.letterboxd.export.stop')}</Button>;
      break;
    case 'done':
      body = <DoneStep report={step.report} onChoose={() => setChoosing(true)} />;
      footer = (
        <>
          {step.report.outcome !== 'finished' && (
            <Button onClick={flow.restart}>{t('auth.account.letterboxd.export.again')}</Button>
          )}
          <Button variant="primary" onClick={close}>
            {t('common.close')}
          </Button>
        </>
      );
      break;
  }

  return (
    <ResponsiveDialog
      open
      title={t('auth.account.letterboxd.export.title')}
      onClose={step.kind === 'importing' ? flow.stop : close}
      footer={<ModalActions>{footer}</ModalActions>}
    >
      <div aria-live="polite">{body}</div>
    </ResponsiveDialog>
  );
}
