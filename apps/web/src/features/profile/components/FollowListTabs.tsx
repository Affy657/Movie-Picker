import { Tabs, type TabDef } from '@/shared/components/Tabs';
import { useTranslation } from '@/shared/i18n';

export const FOLLOW_LIST_TABS_ID = 'follow-list';

export type FollowListTab = 'followers' | 'following';

type Props = {
  tab: FollowListTab;
  followingCount: number;
  followersCount: number;
  onSelect: (tab: FollowListTab) => void;
};

export default function FollowListTabs({
  tab,
  followingCount,
  followersCount,
  onSelect,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const tabs: TabDef<FollowListTab>[] = [
    { key: 'followers', label: t('profile.follow.followersTab'), badge: followersCount },
    { key: 'following', label: t('profile.follow.followingTab'), badge: followingCount },
  ];

  return (
    <Tabs
      idBase={FOLLOW_LIST_TABS_ID}
      variant="pill"
      ariaLabel={t('profile.follow.listTitle')}
      active={tab}
      onChange={onSelect}
      tabs={tabs}
    />
  );
}
