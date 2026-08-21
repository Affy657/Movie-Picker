import { Film } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import { useTranslation } from '@/shared/i18n';

type Props = {
  isHost: boolean;
};

export default function EventClosedWithoutMovieState({ isHost }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <EmptyState
      icon={<Film size={24} aria-hidden />}
      title={t('movies.closed.emptyTitle')}
      message={isHost ? t('movies.closed.emptyHost') : t('movies.closed.emptyParticipant')}
    />
  );
}
