import clsx from 'clsx';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';
import { ICON_SIZE } from './iconSize';
import { preferredLocale, t } from '@/shared/i18n';
import { retryDelayOf } from '@/shared/api/rateLimitCooldown';
import { useRateLimitCooldownMs } from '@/shared/hooks/useRateLimitCooldown';
import styles from './InlineError.module.css';

function cooldownLabel(ms: number): string {
  const { unit, count } = retryDelayOf(ms);
  const key = unit === 'seconds' ? 'errors.api.retryInSeconds' : 'errors.api.retryInMinutes';
  return t(key, { count: String(count) }, preferredLocale());
}

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
  const cooldownMs = useRateLimitCooldownMs();
  return (
    <div className={clsx(styles.root, className)} role={messageRole}>
      <span className={styles.icon} aria-hidden>
        <AlertCircle size={ICON_SIZE.lg} />
      </span>
      <div className={styles.body}>
        <p className={styles.message}>{message}</p>
        <Button type="button" size="sm" onClick={onRetry} disabled={cooldownMs > 0}>
          <RefreshCw size={ICON_SIZE.md} aria-hidden />
          {cooldownMs > 0 ? cooldownLabel(cooldownMs) : retryLabel}
        </Button>
      </div>
    </div>
  );
}
