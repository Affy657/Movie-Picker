import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

type PageLayoutProps = {
  children: ReactNode;
  /** Classes en plus de `page` (ex. `page--landing`, `page-event`). */
  className?: string;
  style?: CSSProperties;
};

export default function PageLayout({ children, className, style }: PageLayoutProps) {
  return (
    <main className={clsx('page', className)} style={style}>
      {children}
    </main>
  );
}
