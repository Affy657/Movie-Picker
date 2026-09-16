import clsx from 'clsx';
import styles from './Spinner.module.css';

type SpinnerProps = {
  className?: string;
};

export default function Spinner({ className }: Readonly<SpinnerProps>) {
  return <span className={clsx(styles.spinner, className)} aria-hidden="true" />;
}
