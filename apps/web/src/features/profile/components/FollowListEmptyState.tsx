import { Search, SearchX, Users } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';

type Props = {
  searching: boolean;
  hasSearchTerm: boolean;
};

export default function FollowListEmptyState({ searching, hasSearchTerm }: Readonly<Props>) {
  const { t } = useTranslation();

  if (!searching) {
    return (
      <EmptyState
        compact
        icon={<Users size={ICON_SIZE['2xl']} aria-hidden />}
        message={t('profile.follow.empty')}
      />
    );
  }

  if (hasSearchTerm) {
    return (
      <EmptyState
        compact
        icon={<SearchX size={ICON_SIZE['2xl']} aria-hidden />}
        title={t('profile.follow.search.emptyTitle')}
        message={t('profile.follow.search.emptyMessage')}
      />
    );
  }

  return (
    <EmptyState
      compact
      icon={<Search size={ICON_SIZE['2xl']} aria-hidden />}
      title={t('profile.follow.search.idleTitle')}
      message={t('profile.follow.search.idleMessage')}
    />
  );
}
