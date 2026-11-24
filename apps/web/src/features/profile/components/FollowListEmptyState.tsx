import { Search, SearchX, Users } from 'lucide-react';
import EmptyState from '@/shared/components/EmptyState';
import { useTranslation } from '@/shared/i18n';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { FollowListTab } from './FollowListTabs';
import styles from './FollowListModal.module.css';

type Props =
  { kind: 'list'; tab: FollowListTab } | { kind: 'searchIdle' } | { kind: 'searchEmpty' };

export default function FollowListEmptyState(props: Readonly<Props>) {
  const { t } = useTranslation();

  if (props.kind === 'list') {
    return (
      <EmptyState
        compact
        className={styles.fill}
        icon={<Users size={ICON_SIZE['2xl']} aria-hidden />}
        title={t(
          props.tab === 'followers'
            ? 'profile.follow.emptyFollowers'
            : 'profile.follow.emptyFollowing'
        )}
      />
    );
  }

  if (props.kind === 'searchEmpty') {
    return (
      <EmptyState
        compact
        className={styles.fill}
        icon={<SearchX size={ICON_SIZE['2xl']} aria-hidden />}
        title={t('profile.follow.search.emptyTitle')}
      />
    );
  }

  return (
    <EmptyState
      compact
      className={styles.fill}
      icon={<Search size={ICON_SIZE['2xl']} aria-hidden />}
      title={t('profile.follow.search.idleTitle')}
      message={t('profile.follow.search.idleMessage')}
    />
  );
}
