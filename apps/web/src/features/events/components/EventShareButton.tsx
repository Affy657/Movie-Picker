import { Share2 } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

interface EventShareButtonProps {
  onClick: () => void;
}

export default function EventShareButton({ onClick }: Readonly<EventShareButtonProps>) {
  const { t } = useTranslation();

  return (
    <IconButton size="lg" ariaLabel={t('share.trigger')} onClick={onClick} aria-haspopup="dialog">
      <Share2 size={ICON_SIZE.md} aria-hidden />
    </IconButton>
  );
}
