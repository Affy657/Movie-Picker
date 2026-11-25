import { type ReactNode, type SubmitEvent, useEffect, useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { APP_VERSION } from '@/shared/appVersion';
import Dropdown from '@/shared/components/Dropdown';
import { createIdeaSuggestion, type IdeaSuggestionCategory } from '@/shared/api/ideaSuggestionsApi';
import styles from './ProposeIdeaButton.module.css';
import { useCloseOnPageChange } from '@/shared/hooks/useCloseOnPageChange';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import Button from '@/shared/components/Button';
import Field from '@/shared/components/Field';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const PAGE_PATH_MAX_LENGTH = 300;

type Status = 'idle' | 'submitting' | 'success' | 'error';

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
};

export function ProposeIdeaDialog({ open, onClose, title: dialogTitle }: Readonly<DialogProps>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [category, setCategory] = useState<IdeaSuggestionCategory>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const formId = useId();
  const categoryFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();

  const categoryOptions = useMemo(
    () => [
      { value: 'idea' as const, label: t('proposeIdea.categoryIdea') },
      { value: 'bug' as const, label: t('proposeIdea.categoryBug') },
      { value: 'improvement' as const, label: t('proposeIdea.categoryImprovement') },
    ],
    [t]
  );

  useEffect(() => {
    if (!open) return;
    setCategory('idea');
    setTitle('');
    setDescription('');
    setStatus('idle');
    setError(null);
  }, [open]);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await createIdeaSuggestion({
        category,
        title: title.trim(),
        description: description.trim(),
        pagePath: location.pathname.slice(0, PAGE_PATH_MAX_LENGTH),
        appVersion: APP_VERSION,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err, t('proposeIdea.submitError')));
    }
  };

  const footer =
    status === 'success' ? (
      <ModalActions>
        <Button type="button" variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </ModalActions>
    ) : (
      <ModalActions>
        <Button type="submit" form={formId} variant="primary" loading={status === 'submitting'}>
          {status === 'submitting' ? t('proposeIdea.submitting') : t('proposeIdea.submit')}
        </Button>
      </ModalActions>
    );

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      sheetSize="lg"
      title={dialogTitle ?? t('proposeIdea.dialogTitle')}
      footer={footer}
    >
      {status === 'success' ? (
        <p className={styles.successMessage} role="status" aria-live="polite">
          {t('proposeIdea.successMessage')}
        </p>
      ) : (
        <form id={formId} onSubmit={(e) => void handleSubmit(e)}>
          <Field label={t('proposeIdea.categoryLabel')} htmlFor={categoryFieldId}>
            {({ id, labelId }) => (
              <Dropdown
                id={id}
                ariaLabelledBy={labelId}
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                className={styles.categoryDropdown}
              />
            )}
          </Field>

          <Field label={t('proposeIdea.titleLabel')} htmlFor={titleFieldId}>
            {({ id }) => (
              <input
                id={id}
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TITLE_MAX_LENGTH}
                required
              />
            )}
          </Field>

          <Field
            label={t('proposeIdea.descriptionLabel')}
            htmlFor={descriptionFieldId}
            hint={t('proposeIdea.descriptionHint', {
              count: String(DESCRIPTION_MAX_LENGTH - description.length),
            })}
            className={styles.descriptionField}
          >
            {({ id, describedBy }) => (
              <textarea
                id={id}
                className={`input ${styles.descriptionInput}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={DESCRIPTION_MAX_LENGTH}
                rows={5}
                required
                aria-describedby={describedBy}
              />
            )}
          </Field>

          <p className="hint">{t('proposeIdea.publicNotice')}</p>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </ResponsiveDialog>
  );
}

type ButtonProps = {
  className?: string;
  children?: ReactNode;
};

export default function ProposeIdeaButton({ className, children }: Readonly<ButtonProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useCloseOnPageChange(() => setOpen(false));

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children ?? t('proposeIdea.trigger')}
      </button>
      {open ? <ProposeIdeaDialog open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
