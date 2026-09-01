import { Search } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './HistoryToolbar.module.css';

interface HistoryToolbarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function HistoryToolbar({ value, onChange }: Readonly<HistoryToolbarProps>) {
  const { t } = useTranslation();

  return (
    <label className={styles.searchWrap}>
      <Search size={15} aria-hidden className={styles.searchIcon} />
      <input
        type="search"
        className={styles.input}
        placeholder={t('events.myEvents.searchPlaceholder')}
        aria-label={t('events.myEvents.searchLabel')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
