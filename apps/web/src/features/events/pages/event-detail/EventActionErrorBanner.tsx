import { useTranslation } from '@/shared/i18n';

type Props = {
  message: string;
  onDismiss: () => void;
};

export default function EventActionErrorBanner({ message, onDismiss }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <div className="error error-dismiss" role="alert">
      <span>{message}</span>
      <button type="button" className="btn-link" onClick={onDismiss} aria-label={t('common.close')}>
        ×
      </button>
    </div>
  );
}
