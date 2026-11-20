import { useId, type ReactNode, type Ref } from 'react';
import styles from './ProfileEditSection.module.css';

interface Props {
  title: string;
  id?: string;
  labelId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}

export default function ProfileEditSection({
  title,
  id,
  labelId,
  headingRef,
  children,
}: Readonly<Props>) {
  const generatedId = useId();
  const headingId = labelId ?? generatedId;

  return (
    <section id={id} aria-labelledby={headingId} className={styles.section}>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className={styles.title}
      >
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
