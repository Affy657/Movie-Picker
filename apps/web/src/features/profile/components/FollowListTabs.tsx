import { UserPlus } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { Tabs } from '@/shared/components/Tabs';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import styles from './FollowListModal.module.css';

export const FOLLOW_LIST_TABS_ID = 'follow-list';

type Tab = 'following' | 'followers' | 'search';

type Props = {
  tab: Tab;
  followingCount: number;
  followersCount: number;
  onSelect: (tab: Tab) => void;
};

export default function FollowListTabs({
  tab,
  followingCount,
  followersCount,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <Tabs
      idBase={FOLLOW_LIST_TABS_ID}
      className={styles.tabs}
      ariaLabel={t('profile.follow.listTitle')}
      active={tab}
      onChange={onSelect}
      tabs={[
        {
          key: 'following',
          label: t('profile.follow.followingCount', { count: String(followingCount) }),
        },
        {
          key: 'followers',
          label: t('profile.follow.followersCount', { count: String(followersCount) }),
        },
        {
          key: 'search',
          label: isMobile
            ? t('profile.follow.search.tabAriaLabel')
            : t('profile.follow.search.tab'),
          icon: isMobile ? <UserPlus size={ICON_SIZE.md} aria-hidden /> : undefined,
          iconOnly: isMobile,
        },
      ]}
    />
  );
}
