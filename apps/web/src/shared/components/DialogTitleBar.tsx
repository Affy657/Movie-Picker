import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './DialogTitleBar.module.css';

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
      <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={closeLabel}>
        <X aria-hidden size={18} />
      </button>
    </div>
  );
}
