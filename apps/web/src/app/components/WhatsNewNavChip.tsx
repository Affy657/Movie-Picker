import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import styles from './WhatsNewNavChip.module.css';

type Props = {
  onOpen: () => void;
};

export default function WhatsNewNavChip({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={styles.chip}
      aria-label={t('nav.whatsNewAria')}
      onClick={onOpen}
    >
      <Sparkles size={14} aria-hidden="true" focusable="false" />
      <span className={styles.label}>{t('nav.whatsNew')}</span>
    </button>
  );
}
