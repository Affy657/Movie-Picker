import { X } from 'lucide-react';
import IconButton from '@/shared/components/IconButton';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';

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
        <X size={ICON_SIZE.md} aria-hidden />
      </IconButton>
    </div>
  );
}
