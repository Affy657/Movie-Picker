import clsx from 'clsx';
import type { ReactNode } from 'react';
import Card from '@/shared/components/Card';
import Tooltip from '@/shared/components/Tooltip';
import styles from './techShared.module.css';

type TechSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
};

export function TechSection({ id, eyebrow, title, lead, children }: Readonly<TechSectionProps>) {
  const headingId = `${id}-title`;
  return (
    <section className={styles.section} id={id} aria-labelledby={headingId}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title} id={headingId}>
          {title}
        </h2>
        {lead ? <p className={styles.lead}>{lead}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function TechHint({
  label,
  placement = 'top',
  className,
  children,
}: Readonly<{
  label: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children: ReactNode;
}>) {
  return (
    <Tooltip label={label} placement={placement} focusable className={className}>
      {children}
    </Tooltip>
  );
}

export type FactItem = {
  key: string;
  icon: ReactNode;
  term: string;
  detail: string;
  hint: string;
  emphasis?: boolean;
  trade?: { label: string; text: string };
};

export function FactGrid({
  heading,
  items,
}: Readonly<{ heading?: string; items: readonly FactItem[] }>) {
  return (
    <div className={styles.facts}>
      {heading ? <p className={styles.groupHeading}>{heading}</p> : null}
      <ul className={styles.factList}>
        {items.map((item) => (
          <li key={item.key}>
            <Card
              as="article"
              padding="sm"
              className={clsx(styles.fact, item.emphasis && styles.factStrong)}
            >
              <span className={styles.factIcon} aria-hidden>
                {item.icon}
              </span>
              <h3 className={styles.factTerm}>
                <TechHint label={item.hint}>{item.term}</TechHint>
              </h3>
              <p className={styles.factDetail}>{item.detail}</p>
              {item.trade ? (
                <p className={styles.factTrade}>
                  <span className={styles.factTradeLabel}>{item.trade.label}</span>{' '}
                  {item.trade.text}
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Figure({ caption, children }: Readonly<{ caption?: string; children: ReactNode }>) {
  return (
    <figure className={styles.figure}>
      <div className={styles.figureScroll} tabIndex={0}>
        {children}
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
