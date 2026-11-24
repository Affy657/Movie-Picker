import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import InlineError from '@/shared/components/InlineError';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import type { FollowUserItem } from '@/features/profile/api/profileApi';
import FollowListEmptyState from './FollowListEmptyState';
import type { FollowListTab } from './FollowListTabs';
import styles from './FollowListModal.module.css';

type Props = {
  tab: FollowListTab;
  listQuery: UseQueryResult<{ items: FollowUserItem[] }>;
  listedCount: number;
  renderRow: (item: FollowUserItem, highlight: string) => ReactNode;
};

export default function FollowListTabPanel({
  tab,
  listQuery,
  listedCount,
  renderRow,
}: Readonly<Props>) {
  const { t } = useTranslation();

  if (listQuery.isPending) {
    return <p className={styles.placeholder}>{t('common.loading')}</p>;
  }

  if (listQuery.isError && !listQuery.data) {
    return (
      <div className={styles.fill}>
        <InlineError
          message={t('profile.follow.loadError')}
          retryLabel={t('common.retry')}
          onRetry={() => void listQuery.refetch()}
        />
      </div>
    );
  }

  const items = listQuery.data?.items ?? [];

  return (
    <>
      {items.length === 0 ? (
        <FollowListEmptyState kind="list" tab={tab} />
      ) : (
        <ul className={styles.list}>{items.map((item) => renderRow(item, ''))}</ul>
      )}
      {listedCount > items.length ? (
        <p className={styles.privateNote}>
          <Lock size={ICON_SIZE.sm} aria-hidden />
          <span>{t('profile.follow.privateHidden')}</span>
        </p>
      ) : null}
    </>
  );
}
