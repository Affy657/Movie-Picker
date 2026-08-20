import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './EventInfoBanner.module.css';

type Props = {
  tone: 'pending' | 'upcoming';
  icon: ReactNode;
  kicker: string;
  text: string;
  meta: string;
};

export default function EventInfoBanner({ tone, icon, kicker, text, meta }: Readonly<Props>) {
  return (
    <aside className={clsx(styles.root, styles[tone])} role="status" aria-live="polite">
      <span className={styles.iconWrap} aria-hidden>
        {icon}
      </span>
      <div className={styles.body}>
        <strong className={styles.kicker}>{kicker}</strong>
        <p className={styles.text}>{text}</p>
        <p className={styles.meta}>{meta}</p>
      </div>
    </aside>
  );
}
