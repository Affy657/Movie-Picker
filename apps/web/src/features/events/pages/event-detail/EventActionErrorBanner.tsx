import { X } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
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
      <IconButton size="sm" tone="danger" label={t('common.close')} onClick={onDismiss}>
        <X size={16} aria-hidden />
      </IconButton>
    </div>
  );
}
