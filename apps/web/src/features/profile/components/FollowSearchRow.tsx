import SearchField from '@/shared/components/SearchField';
import { useTranslation } from '@/shared/i18n';
import styles from './FollowListModal.module.css';

export const MIN_SEARCH_LENGTH = 2;

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export default function FollowSearchRow({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const typed = value.trim().length;
  const tooShort = typed > 0 && typed < MIN_SEARCH_LENGTH;

  return (
    <div className={styles.searchRow}>
      <SearchField
        value={value}
        onChange={onChange}
        placeholder={t('profile.follow.search.placeholder')}
        ariaLabel={t('profile.follow.search.tabAriaLabel')}
      />
      {tooShort && (
        <p className={styles.hint}>
          {t('profile.follow.search.minLength', { count: String(MIN_SEARCH_LENGTH) })}
        </p>
      )}
    </div>
  );
}
