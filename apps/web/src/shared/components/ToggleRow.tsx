import { useId } from 'react';
import clsx from 'clsx';
import Toggle from './Toggle';
import styles from './ToggleRow.module.css';

interface ToggleRowProps {
  title: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}

export default function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  className,
}: Readonly<ToggleRowProps>) {
  const titleId = useId();

  return (
    <div className={clsx(styles.row, className)}>
      <span className={styles.text}>
        <span id={titleId} className={styles.title}>
          {title}
        </span>
        {description ? <span className={styles.description}>{description}</span> : null}
      </span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} labelledBy={titleId} />
    </div>
  );
}
