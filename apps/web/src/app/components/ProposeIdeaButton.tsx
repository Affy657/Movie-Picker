import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { useModalDialog } from '@/shared/hooks/useDialogOpen';
import { getErrorMessage } from '@/shared/api/apiError';
import { APP_VERSION } from '@/shared/appVersion';
import Dropdown from '@/shared/components/Dropdown';
import { createIdeaSuggestion, type IdeaSuggestionCategory } from '@/shared/api/ideaSuggestionsApi';
import styles from './ProposeIdeaButton.module.css';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

type Status = 'idle' | 'submitting' | 'success' | 'error';

type DialogProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Rendu séparé du déclencheur : à monter une seule fois, hors de tout arbre
 * qui pourrait se démonter (ex. un dropdown qui se ferme au clic), sous
 * peine de voir la modale disparaître avec son déclencheur avant d'avoir
 * pu s'afficher.
 */
export function ProposeIdeaDialog({ open, onClose }: Readonly<DialogProps>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [category, setCategory] = useState<IdeaSuggestionCategory>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const categoryFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();

  const dialogRef = useModalDialog(open, onClose);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await createIdeaSuggestion({
        category,
        title: title.trim(),
        description: description.trim(),
        pagePath: location.pathname,
        appVersion: APP_VERSION,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err, t('proposeIdea.submitError')));
    }
  };

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {t('proposeIdea.dialogTitle')}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        {status === 'success' ? (
          <div className={styles.successState}>
            <p className={styles.successMessage} role="status" aria-live="polite">
              {t('proposeIdea.successMessage')}
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <p className={styles.intro}>{t('proposeIdea.dialogIntro')}</p>

            <label className="label" htmlFor={categoryFieldId}>
              {t('proposeIdea.categoryLabel')}
            </label>
            <Dropdown
              id={categoryFieldId}
              value={category}
              options={categoryOptions}
              onChange={setCategory}
              className={styles.categoryDropdown}
            />

            <label className="label" htmlFor={titleFieldId}>
              {t('proposeIdea.titleLabel')}
            </label>
            <input
              id={titleFieldId}
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              required
            />

            <label className="label" htmlFor={descriptionFieldId}>
              {t('proposeIdea.descriptionLabel')}
            </label>
            <textarea
              id={descriptionFieldId}
              className={`input ${styles.descriptionInput}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={5}
              required
            />
            <p className={`hint ${styles.descriptionHint}`}>
              {t('proposeIdea.descriptionHint', {
                count: String(DESCRIPTION_MAX_LENGTH - description.length),
              })}
            </p>

            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.actions}>
              <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? t('proposeIdea.submitting') : t('proposeIdea.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

type ButtonProps = {
  className?: string;
  children?: ReactNode;
};

export default function ProposeIdeaButton({ className, children }: Readonly<ButtonProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
      <ProposeIdeaDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
