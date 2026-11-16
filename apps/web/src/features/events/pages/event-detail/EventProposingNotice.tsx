import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import { proposingLabel } from '@/features/events/utils/presenceLabels';
import styles from './EventProposingNotice.module.css';

export default function EventProposingNotice({ names }: Readonly<{ names: readonly string[] }>) {
  const { t } = useTranslation();
  const label = proposingLabel(names, t);
  return (
    <div className={styles.root} role="status" aria-live="polite">
      {label ? (
        <Chip tone="primary" size="sm" dot="pulsing">
          {label}
        </Chip>
      ) : null}
    </div>
  );
}
