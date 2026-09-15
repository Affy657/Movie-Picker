import { Sparkles } from 'lucide-react';
import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import styles from './WhatsNewNavChip.module.css';

type Props = {
  onOpen: () => void;
};

export default function WhatsNewNavChip({ onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Chip
      tone="primary"
      icon={Sparkles}
      label={t('nav.whatsNewAria')}
      onClick={onOpen}
      className={styles.chip}
    >
      <span className={styles.label}>{t('nav.whatsNew')}</span>
    </Chip>
  );
}
