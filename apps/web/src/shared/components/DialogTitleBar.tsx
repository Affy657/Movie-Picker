import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './DialogTitleBar.module.css';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

export default function DialogTitleBar({
  titleId,
  title,
  detail,
  onClose,
  closeAriaLabel,
}: Readonly<{
  titleId: string;
  title: ReactNode;
  detail?: ReactNode;
  onClose: () => void;
  closeAriaLabel: string;
}>) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {detail}
      </div>
      <IconButton ariaLabel={closeAriaLabel} onClick={onClose}>
        <X aria-hidden size={ICON_SIZE.lg} />
      </IconButton>
    </div>
  );
}
