import { Check, X } from 'lucide-react';
import Button from '@/shared/components/Button';
import { useTranslation } from '@/shared/i18n';
import { MAX_EVENT_TEMPLATE_NAME_LENGTH } from '@/features/events/types';
import styles from './TemplateNameEditor.module.css';

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TemplateNameEditor({
  id,
  value,
  onChange,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <div className={styles.editor}>
      <label className="visually-hidden" htmlFor={id}>
        {t('events.settings.templates.nameLabel')}
      </label>
      <input
        id={id}
        type="text"
        className={`input ${styles.input}`}
        value={value}
        maxLength={MAX_EVENT_TEMPLATE_NAME_LENGTH}
        placeholder={t('events.settings.templates.namePlaceholder')}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onConfirm();
          }
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Button
        variant="primary"
        className={styles.iconSquare}
        aria-label={t('events.settings.templates.confirmAriaLabel')}
        onClick={onConfirm}
      >
        <Check size={16} aria-hidden />
      </Button>
      <button
        type="button"
        className={`icon-btn-outline ${styles.iconSquare}`}
        aria-label={t('events.settings.templates.cancelAriaLabel')}
        onClick={onCancel}
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
