import { useId } from 'react';
import { Eye } from 'lucide-react';
import Button from '@/shared/components/Button';
import Toggle from '@/shared/components/Toggle';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useTranslation } from '@/shared/i18n';
import styles from './DimWatchedControl.module.css';

export interface DimWatchedOption {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function DimWatchedControl({
  enabled,
  onChange,
  isMobile,
}: Readonly<DimWatchedOption & { isMobile: boolean }>) {
  const { t } = useTranslation();
  const labelId = useId();
  const label = t('watched.dim.label');
  if (isMobile) {
    return (
      <Button
        type="button"
        size="sm"
        variant={enabled ? 'soft' : 'secondary'}
        className={styles.button}
        aria-label={label}
        aria-pressed={enabled}
        onClick={() => onChange(!enabled)}
      >
        <Eye size={ICON_SIZE.md} aria-hidden />
      </Button>
    );
  }
  return (
    <span className={styles.toggle}>
      <Toggle checked={enabled} onChange={onChange} ariaLabelledBy={labelId} />
      <span id={labelId} className={styles.label}>
        {label}
      </span>
    </span>
  );
}
