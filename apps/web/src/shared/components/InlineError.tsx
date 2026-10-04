import clsx from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';
import { ICON_SIZE } from './iconSize';
import styles from './InlineError.module.css';

type InlineErrorProps = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  messageRole?: 'alert' | 'status';
  className?: string;
};

export default function InlineError({
  message,
  retryLabel,
  onRetry,
  messageRole = 'alert',
  className,
}: Readonly<InlineErrorProps>) {
  return (
    <div className={clsx(styles.root, className)} role={messageRole}>
      <span className={styles.icon} aria-hidden>
        <AlertCircle size={ICON_SIZE.lg} />
      </span>
      <div className={styles.body}>
        <p className={styles.message}>{message}</p>
        <Button type="button" size="sm" onClick={onRetry}>
          <RefreshCw size={ICON_SIZE.md} aria-hidden />
          {retryLabel}
        </Button>
      </div>
    </div>
  );
}
