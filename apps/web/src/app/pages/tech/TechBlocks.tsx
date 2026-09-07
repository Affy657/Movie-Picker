import clsx from 'clsx';
import type { ReactNode } from 'react';
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

export type SpecItem = {
  term: string;
  detail: string;
  emphasis?: boolean;
};

export function SpecList({ items }: Readonly<{ items: readonly SpecItem[] }>) {
  return (
    <dl className={styles.specs}>
      {items.map((item) => (
        <div className={styles.specRow} key={item.term}>
          <dt className={styles.specTerm}>{item.term}</dt>
          <dd className={clsx(styles.specDetail, item.emphasis && styles.specDetailStrong)}>
            {item.detail}
          </dd>
        </div>
      ))}
    </dl>
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

type IncidentStep = {
  label: string;
  text: string;
};

type IncidentProps = {
  kicker: string;
  title: string;
  steps: readonly IncidentStep[];
};

export function Incident({ kicker, title, steps }: Readonly<IncidentProps>) {
  return (
    <div className={styles.incident}>
      <div className={styles.incidentHead}>
        <p className={styles.incidentKicker}>{kicker}</p>
        <h3 className={styles.incidentTitle}>{title}</h3>
      </div>
      <div className={styles.incidentSteps}>
        {steps.map((step) => (
          <div className={styles.step} key={step.label}>
            <p className={styles.stepLabel}>{step.label}</p>
            <p className={styles.stepText}>{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
