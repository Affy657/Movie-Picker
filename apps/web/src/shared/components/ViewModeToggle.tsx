import clsx from 'clsx';
import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './ViewModeToggle.module.css';
import Card from '@/shared/components/Card';

export type MovieViewMode = 'grid' | 'list';

type ViewModeToggleProps = {
  value: MovieViewMode;
  onChange: (mode: MovieViewMode) => void;
  className?: string;
};

export default function ViewModeToggle({
  value,
  onChange,
  className,
}: Readonly<ViewModeToggleProps>) {
  const { t } = useTranslation();

  return (
    <Card
      padding="none"
      className={clsx(styles.root, className)}
      role="toolbar"
      aria-label={t('movies.list.viewToggleAria')}
    >
      <button
        type="button"
        className={clsx(styles.btn, value === 'list' && styles.btnActive)}
        aria-pressed={value === 'list'}
        aria-label={t('movies.list.viewListAria')}
        onClick={() => onChange('list')}
      >
        <List aria-hidden size={15} />
      </button>
      <button
        type="button"
        className={clsx(styles.btn, value === 'grid' && styles.btnActive)}
        aria-pressed={value === 'grid'}
        aria-label={t('movies.list.viewGridAria')}
        onClick={() => onChange('grid')}
      >
        <LayoutGrid aria-hidden size={15} />
      </button>
    </Card>
  );
}
