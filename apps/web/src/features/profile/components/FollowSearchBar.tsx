import { useEffect, useRef } from 'react';
import Button from '@/shared/components/Button';
import SearchField from '@/shared/components/SearchField';
import { useTranslation } from '@/shared/i18n';
import styles from './FollowListModal.module.css';

export const MIN_SEARCH_LENGTH = 2;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
};

export default function FollowSearchBar({ value, onChange, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={styles.searchBar}>
      <SearchField
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder={t('profile.follow.search.placeholder')}
        ariaLabel={t('profile.follow.search.tabAriaLabel')}
        className={styles.searchField}
      />
      <Button variant="ghost" onClick={onCancel}>
        {t('common.cancel')}
      </Button>
    </div>
  );
}
