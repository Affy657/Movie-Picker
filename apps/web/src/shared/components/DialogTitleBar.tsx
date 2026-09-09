import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './DialogTitleBar.module.css';
import IconButton from '@/shared/components/IconButton';

export default function DialogTitleBar({
  titleId,
  title,
  onClose,
  closeLabel,
}: Readonly<{
  titleId: string;
  title: ReactNode;
  onClose: () => void;
  closeLabel: string;
}>) {
  return (
    <div className={styles.header}>
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <IconButton label={closeLabel} onClick={onClose}>
        <X aria-hidden size={18} />
      </IconButton>
    </div>
  );
}
