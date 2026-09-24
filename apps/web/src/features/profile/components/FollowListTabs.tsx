import { UserPlus } from 'lucide-react';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { Tabs, type TabDef } from '@/shared/components/Tabs';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import styles from './FollowListModal.module.css';

export const FOLLOW_LIST_TABS_ID = 'follow-list';

type Tab = 'following' | 'followers' | 'search';

type Props = {
  tab: Tab;
  followingCount: number;
  followersCount: number;
  canSearch: boolean;
  onSelect: (tab: Tab) => void;
};

export default function FollowListTabs({
  tab,
  followingCount,
  followersCount,
  canSearch,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  const countTabs: TabDef<Tab>[] = [
    {
      key: 'following',
      label: t('profile.follow.followingCount', { count: String(followingCount) }),
    },
    {
      key: 'followers',
      label: t('profile.follow.followersCount', { count: String(followersCount) }),
    },
  ];
  const searchTab: TabDef<Tab> = {
    key: 'search',
    label: isMobile ? t('profile.follow.search.tabAriaLabel') : t('profile.follow.search.tab'),
    icon: isMobile ? <UserPlus size={ICON_SIZE.md} aria-hidden /> : undefined,
    iconOnly: isMobile,
  };

  return (
    <Tabs
      idBase={FOLLOW_LIST_TABS_ID}
      className={styles.tabs}
      ariaLabel={t('profile.follow.listTitle')}
      active={tab}
      onChange={onSelect}
      tabs={canSearch ? [...countTabs, searchTab] : countTabs}
    />
  );
}
