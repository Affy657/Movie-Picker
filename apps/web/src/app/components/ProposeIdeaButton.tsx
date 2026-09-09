import {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router';
import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import { getErrorMessage } from '@/shared/api/apiError';
import { APP_VERSION } from '@/shared/appVersion';
import Dropdown from '@/shared/components/Dropdown';
import { createIdeaSuggestion, type IdeaSuggestionCategory } from '@/shared/api/ideaSuggestionsApi';
import styles from './ProposeIdeaButton.module.css';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import IconButton from '@/shared/components/IconButton';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

type Status = 'idle' | 'submitting' | 'success' | 'error';

type Attachment = {
  id: string;
  file: File;
  previewUrl: string;
};

type DialogProps = {
  open: boolean;
  onClose: () => void;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ProposeIdeaDialog({ open, onClose }: Readonly<DialogProps>) {
  const { t } = useTranslation();
  const location = useLocation();
  const [category, setCategory] = useState<IdeaSuggestionCategory>('idea');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const titleId = useId();
  const categoryFieldId = useId();
  const titleFieldId = useId();
  const descriptionFieldId = useId();
  const attachmentsLabelId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const addAttachments = (files: FileList | File[]) => {
    setAttachmentError(null);
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (incoming.length === 0) return;

    setAttachments((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_ATTACHMENTS) {
          setAttachmentError(t('proposeIdea.attachmentsTooMany', { max: MAX_ATTACHMENTS }));
          break;
        }
        if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
          setAttachmentError(t('proposeIdea.attachmentsUnsupportedType', { name: file.name }));
          continue;
        }
        if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
          setAttachmentError(t('proposeIdea.attachmentsTooLarge', { name: file.name }));
          continue;
        }
        next.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
      }
      return next;
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addAttachments(e.target.files);
    e.target.value = '';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    addAttachments(e.dataTransfer.files);
  };

  const handlePaste = (e: ClipboardEvent<HTMLElement>) => {
    const files = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length > 0) addAttachments(files);
  };

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
    setAttachments((prev) => {
      for (const a of prev) URL.revokeObjectURL(a.previewUrl);
      return [];
    });
    setAttachmentError(null);
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const attachmentPayload = await Promise.all(
        attachments.map(async (a) => ({
          fileName: a.file.name,
          contentType: a.file.type,
          base64Content: await fileToBase64(a.file),
        }))
      );
      await createIdeaSuggestion({
        category,
        title: title.trim(),
        description: description.trim(),
        pagePath: location.pathname,
        appVersion: APP_VERSION,
        attachments: attachmentPayload.length > 0 ? attachmentPayload : undefined,
      });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(getErrorMessage(err, t('proposeIdea.submitError')));
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md" labelledBy={titleId}>
      <div className={styles.inner}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {t('proposeIdea.dialogTitle')}
          </h2>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X size={18} aria-hidden />
          </IconButton>
        </header>

        {status === 'success' ? (
          <div className={styles.successState}>
            <p className={styles.successMessage} role="status" aria-live="polite">
              {t('proposeIdea.successMessage')}
            </p>
            <Button type="button" variant="primary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
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
              onPaste={handlePaste}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={5}
              required
            />
            <p className={`hint ${styles.descriptionHint}`}>
              {t('proposeIdea.descriptionHint', {
                count: String(DESCRIPTION_MAX_LENGTH - description.length),
              })}
            </p>

            <div className={styles.attachmentsSection}>
              <span className="label" id={attachmentsLabelId}>
                {t('proposeIdea.attachmentsLabel')}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
                multiple
                hidden
                onChange={handleFileInputChange}
              />
              <div
                className={`${styles.dropZone} ${isDraggingOver ? styles.dropZoneActive : ''}`}
                role="group"
                aria-labelledby={attachmentsLabelId}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Button
                  type="button"

                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                >
                  <ImagePlus size={16} aria-hidden />
                  {t('proposeIdea.attachmentsAddButton')}
                </Button>
                <p className={`hint ${styles.attachmentsHint}`}>
                  {t('proposeIdea.attachmentsDropHint', { max: MAX_ATTACHMENTS })}
                </p>
                {attachments.length > 0 ? (
                  <div className={styles.thumbnails}>
                    {attachments.map((a, index) => (
                      <div key={a.id} className={styles.thumbnail}>
                        <img src={a.previewUrl} alt="" className={styles.thumbnailImage} />
                        <button
                          type="button"
                          className={styles.thumbnailRemove}
                          onClick={() => removeAttachment(a.id)}
                          aria-label={`${t('proposeIdea.attachmentsRemove')} ${index + 1}`}
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {attachmentError ? (
                <p className={`error ${styles.attachmentsError}`} role="alert">
                  {attachmentError}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}

            <div className={styles.actions}>
              <Button type="submit" variant="primary" disabled={status === 'submitting'}>
                {status === 'submitting' ? t('proposeIdea.submitting') : t('proposeIdea.submit')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
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
      {open ? <ProposeIdeaDialog open onClose={() => setOpen(false)} /> : null}
    </>
  );
}
