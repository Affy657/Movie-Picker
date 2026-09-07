import { Search } from 'lucide-react';
import clsx from 'clsx';
import styles from './SearchField.module.css';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  iconSize?: number;
  className?: string;
  inputClassName?: string;
}

export default function SearchField({
  value,
  onChange,
  placeholder,
  id,
  ariaLabel,
  ariaDescribedBy,
  iconSize = 15,
  className,
  inputClassName,
}: Readonly<SearchFieldProps>) {
  return (
    <span className={clsx(styles.wrap, className)}>
      <Search size={iconSize} aria-hidden className={styles.icon} />
      <input
        id={id}
        type="search"
        className={clsx(styles.input, inputClassName)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}
