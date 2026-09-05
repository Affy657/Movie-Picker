import { useId, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Field.module.css';

type FieldRenderArgs = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
};

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  className?: string;
  children: (args: FieldRenderArgs) => ReactNode;
};

export default function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: Readonly<FieldProps>) {
  const reactId = useId();
  const id = htmlFor ?? `field-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx(styles.field, className)}>
      <label className={clsx('label', styles.label)} htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} className={clsx('hint', styles.hint)}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
