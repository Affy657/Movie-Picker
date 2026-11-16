import ProgressBar from '@/shared/components/ProgressBar';
import { useTranslation } from '@/shared/i18n';
import { renderWithBold } from '@/shared/utils/renderWithBold';
import { listProgressDetail } from '@/features/lists/utils/listProgress';

export default function ListProgress({
  watched,
  total,
  className,
}: Readonly<{ watched: number; total: number; className?: string }>) {
  const { t, locale } = useTranslation();
  return (
    <ProgressBar
      className={className}
      value={(watched / total) * 100}
      label={renderWithBold(listProgressDetail(watched, total, t, locale))}
    />
  );
}
