import { Check } from 'lucide-react';
import Chip from '@/shared/components/Chip';
import { useTranslation } from '@/shared/i18n';
import styles from './CopyLinkStatus.module.css';

export default function CopyLinkStatus({ copied }: Readonly<{ copied: boolean }>) {
  const { t } = useTranslation();
  return (
    <output className={styles.status}>
      {copied ? (
        <Chip size="sm" tone="success" icon={Check}>
          {t('lists.page.linkCopied')}
        </Chip>
      ) : null}
    </output>
  );
}
