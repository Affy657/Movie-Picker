import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { ICON_SIZE } from './iconSize';
import { hasDescenders } from './opticalNudge';
import styles from './BackLink.module.css';

type BackLinkProps = {
  children: string;
  className?: string;
} & ({ to: string; onClick?: never } | { onClick: () => void; to?: never });

export default function BackLink({ children, className, to, onClick }: Readonly<BackLinkProps>) {
  const content = (
    <>
      <ArrowLeft size={ICON_SIZE.md} aria-hidden />
      <span className={clsx(styles.label, !hasDescenders(children) && styles.labelCaps)}>
        {children}
      </span>
    </>
  );

  if (to !== undefined) {
    return (
      <Link to={to} className={clsx(styles.root, className)}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={clsx(styles.root, className)} onClick={onClick}>
      {content}
    </button>
  );
}
