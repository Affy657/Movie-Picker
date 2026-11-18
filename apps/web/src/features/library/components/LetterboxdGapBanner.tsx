import { AlertCircle } from 'lucide-react';
import Button from '@/shared/components/Button';
import { ICON_SIZE } from '@/shared/components/iconSize';
import sharedStyles from '@/shared/components/SettingsSection.module.css';
import { useTranslation } from '@/shared/i18n';
import { pluralizeCount } from '@/shared/i18n/pluralizeCount';

interface LetterboxdGapBannerProps {
  count: number;
  showing: boolean;
  onShow: () => void;
  onShowAll: () => void;
}

export default function LetterboxdGapBanner({
  count,
  showing,
  onShow,
  onShowAll,
}: Readonly<LetterboxdGapBannerProps>) {
  const { t } = useTranslation();
  const message = showing
    ? pluralizeCount(
        count,
        'watchlist.letterboxdGap.filteredOne',
        'watchlist.letterboxdGap.filtered',
        t
      )
    : pluralizeCount(
        count,
        'watchlist.letterboxdGap.messageOne',
        'watchlist.letterboxdGap.message',
        t
      );
  const actionLabel = showing
    ? t('watchlist.letterboxdGap.showAll')
    : pluralizeCount(count, 'watchlist.letterboxdGap.showOne', 'watchlist.letterboxdGap.show', t);

  return (
    <output className={sharedStyles.attention}>
      <AlertCircle size={ICON_SIZE.md} aria-hidden />
      <span className={sharedStyles.attentionText}>{message}</span>
      <Button type="button" size="sm" tone="warning" onClick={showing ? onShowAll : onShow}>
        {actionLabel}
      </Button>
    </output>
  );
}
