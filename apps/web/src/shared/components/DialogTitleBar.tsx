import type { ReactNode } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import styles from './DialogTitleBar.module.css';
import IconButton from '@/shared/components/IconButton';
import { ICON_SIZE } from '@/shared/components/iconSize';

export interface DialogTitleBarProps {
  titleId: string;
  title: ReactNode;
  detail?: ReactNode;
  onClose: () => void;
  closeAriaLabel: string;
  leading?: ReactNode;
  actions?: ReactNode;
  replacement?: ReactNode;
  divided?: boolean;
  className?: string;
  children?: ReactNode;
}

export default function DialogTitleBar({
  titleId,
  title,
  detail,
  onClose,
  closeAriaLabel,
  leading,
  actions,
  replacement,
  divided = false,
  className,
  children,
}: Readonly<DialogTitleBarProps>) {
  return (
    <div className={clsx(styles.header, divided && styles.divided, className)}>
      {replacement ? (
        <>
          <h2 id={titleId} className="visually-hidden">
            {title}
          </h2>
          <div className={styles.row}>{replacement}</div>
        </>
      ) : (
        <div className={styles.row}>
          {leading}
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {detail ? <div className={styles.detail}>{detail}</div> : null}
          </div>
          {actions}
          <IconButton size="lg" ariaLabel={closeAriaLabel} onClick={onClose}>
            <X aria-hidden size={ICON_SIZE.lg} />
          </IconButton>
        </div>
      )}
      {children ? <div className={styles.below}>{children}</div> : null}
    </div>
  );
}
