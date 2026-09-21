import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Card from './Card';
import IconButton from './IconButton';
import { ICON_SIZE } from './iconSize';
import styles from './TopNotice.module.css';

type TopNoticeProps = {
  title: string;
  description: string;
  onDismiss: () => void;
  children?: ReactNode;
};

export default function TopNotice({
  title,
  description,
  onDismiss,
  children,
}: Readonly<TopNoticeProps>) {
  const { t } = useTranslation();

  return (
    <Card
      as="section"
      padding="none"
      elevation="lg"
      className={styles.root}
      aria-label={title}
      aria-live="polite"
    >
      <div className={styles.header}>
        <div className={styles.content}>
          <p className={styles.title}>{title}</p>
          <p className={styles.description}>{description}</p>
        </div>
        <IconButton ariaLabel={t('common.close')} onClick={onDismiss}>
          <X size={ICON_SIZE.lg} aria-hidden />
        </IconButton>
      </div>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </Card>
  );
}
