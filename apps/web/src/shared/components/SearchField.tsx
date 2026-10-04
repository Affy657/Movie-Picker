import { Search } from 'lucide-react';
import clsx from 'clsx';
import styles from './SearchField.module.css';
import { ICON_SIZE, type IconSizeValue } from '@/shared/components/iconSize';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  iconSize?: IconSizeValue;
  className?: string;
  disabled?: boolean;
}

export default function SearchField({
  value,
  onChange,
  placeholder,
  id,
  ariaLabel,
  ariaDescribedBy,
  iconSize = ICON_SIZE.md,
  className,
  disabled,
}: Readonly<SearchFieldProps>) {
  return (
    <span className={clsx(styles.wrap, className)}>
      <Search size={iconSize} aria-hidden className={styles.icon} />
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        autoCorrect="off"
        className={clsx('input', styles.input)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}
