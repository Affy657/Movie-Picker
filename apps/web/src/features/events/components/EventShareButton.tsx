import { Share2 } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import IconButton from '@/shared/components/IconButton';

interface EventShareButtonProps {
  onClick: () => void;
}

export default function EventShareButton({ onClick }: Readonly<EventShareButtonProps>) {
  const { t } = useTranslation();

  return (
    <IconButton size="lg" label={t('share.trigger')} onClick={onClick} aria-haspopup="dialog">
      <Share2 size={16} aria-hidden />
    </IconButton>
  );
}
