import { Film } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';

type Props = {
  isHost: boolean;
};

export default function EventClosedWithoutMovieState({ isHost }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<Film size={ICON_SIZE['2xl']} aria-hidden />}
      title={t('movies.closed.emptyTitle')}
      message={isHost ? t('movies.closed.emptyHost') : t('movies.closed.emptyParticipant')}
    />
  );
}
