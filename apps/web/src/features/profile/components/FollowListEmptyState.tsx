import { Search, SearchX, Users } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import { useTranslation } from '@/shared/i18n';

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
        icon={<Users size={22} aria-hidden />}
        message={t('profile.follow.empty')}
      />
    );
  }

  if (hasSearchTerm) {
    return (
      <EmptyState
        compact
        icon={<SearchX size={22} aria-hidden />}
        title={t('profile.follow.search.emptyTitle')}
        message={t('profile.follow.search.emptyMessage')}
      />
    );
  }

  return (
    <EmptyState
      compact
      icon={<Search size={22} aria-hidden />}
      title={t('profile.follow.search.idleTitle')}
      message={t('profile.follow.search.idleMessage')}
    />
  );
}
