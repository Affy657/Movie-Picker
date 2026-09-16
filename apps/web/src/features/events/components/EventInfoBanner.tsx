import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EventInfoBanner.module.css';

type Props = {
  tone: 'pending' | 'upcoming';
  icon: ReactNode;
  kicker: string;
  text: string;
  meta: string;
  actions?: ReactNode;
};

export default function EventInfoBanner({
  tone,
  icon,
  kicker,
  text,
  meta,
  actions,
}: Readonly<Props>) {
  const kickerId = useId();
  return (
    <aside
      className={clsx(styles.root, styles[tone])}
      role="status"
      aria-live="polite"
      aria-labelledby={kickerId}
    >
      <span className={styles.iconWrap} aria-hidden>
        {icon}
      </span>
      <div className={styles.body}>
        <strong id={kickerId} className={styles.kicker}>
          {kicker}
        </strong>
        <p className={styles.text}>{text}</p>
        <p className={styles.meta}>{meta}</p>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
    </aside>
  );
}
