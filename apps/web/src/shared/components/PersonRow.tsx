import type { ReactNode, Ref } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import StatusDot from './StatusDot';
import styles from './PersonRow.module.css';

export interface PersonRowProps {
  avatar: ReactNode;
  name: ReactNode;
  badges?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
  online?: boolean;
  to?: string;
  linkAriaLabel?: string;
  onNavigate?: () => void;
  muted?: boolean;
  rowRef?: Ref<HTMLLIElement>;
  tabIndex?: number;
  className?: string;
  'data-testid'?: string;
}

export default function PersonRow({
  avatar,
  name,
  badges,
  detail,
  action,
  online = false,
  to,
  linkAriaLabel,
  onNavigate,
  muted = false,
  rowRef,
  tabIndex,
  className,
  'data-testid': testId,
}: Readonly<PersonRowProps>) {
  const identity = (
    <>
      <span className={styles.avatar}>
        {avatar}
        {online ? <StatusDot className={styles.presence} /> : null}
      </span>
      <span className={styles.text}>
        <span className={styles.nameLine}>
          <span className={styles.name}>{name}</span>
          {badges}
        </span>
        {detail ? <span className={styles.detail}>{detail}</span> : null}
      </span>
    </>
  );

  return (
    <li
      ref={rowRef}
      tabIndex={tabIndex}
      className={clsx(styles.row, muted && styles.muted, className)}
      data-testid={testId}
    >
      {to ? (
        <Link
          to={to}
          aria-label={linkAriaLabel}
          className={clsx(styles.identity, styles.identityLink)}
          onClick={onNavigate}
        >
          {identity}
        </Link>
      ) : (
        <span className={styles.identity}>{identity}</span>
      )}
      {action ? <div className={styles.action}>{action}</div> : null}
    </li>
  );
}
