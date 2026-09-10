import { UserPlus } from 'lucide-react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useTranslation } from '@/shared/i18n';
import styles from './FollowListModal.module.css';

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
  const classOf = (candidate: Tab) => (candidate === tab ? styles.tabActive : styles.tab);

  return (
    <div className={styles.tabs}>
      <button type="button" className={classOf('following')} onClick={() => onSelect('following')}>
        {t('profile.follow.followingCount', { count: String(followingCount) })}
      </button>
      <button type="button" className={classOf('followers')} onClick={() => onSelect('followers')}>
        {t('profile.follow.followersCount', { count: String(followersCount) })}
      </button>
      <button
        type="button"
        className={classOf('search')}
        onClick={() => onSelect('search')}
        aria-label={isMobile ? t('profile.follow.search.tabAriaLabel') : undefined}
      >
        {isMobile ? <UserPlus size={16} aria-hidden /> : t('profile.follow.search.tab')}
      </button>
    </div>
  );
}
