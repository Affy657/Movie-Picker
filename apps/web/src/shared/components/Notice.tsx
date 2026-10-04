import type { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';
import Card from './Card';
import IconButton from './IconButton';
import { ICON_SIZE } from './iconSize';
import styles from './Notice.module.css';

export type NoticePlacement = 'top' | 'bottom';

type NoticeProps = {
  title: string;
  description: string;
  placement?: NoticePlacement;
  onClose?: () => void;
  children?: ReactNode;
};

export default function Notice({
  title,
  description,
  placement = 'top',
  onClose,
  children,
}: Readonly<NoticeProps>) {
  const { t } = useTranslation();

  return (
    <Card
      as="section"
      padding="none"
      elevation="lg"
      className={clsx(styles.root, placement === 'top' ? styles.top : styles.bottom)}
      aria-label={title}
      aria-live="polite"
    >
      <div className={styles.header}>
        <div className={styles.content}>
          <p className={styles.title}>{title}</p>
          <p className={styles.description}>{description}</p>
        </div>
        {onClose ? (
          <IconButton ariaLabel={t('common.close')} onClick={onClose}>
            <X size={ICON_SIZE.lg} aria-hidden />
          </IconButton>
        ) : null}
      </div>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </Card>
  );
}
