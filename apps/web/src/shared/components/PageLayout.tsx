import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';

type PageLayoutProps = {
  children: ReactNode;

  className?: string;
  style?: CSSProperties;
};

export default function PageLayout({ children, className, style }: Readonly<PageLayoutProps>) {
  return (
    <main id="main-content" tabIndex={-1} className={clsx('page', className)} style={style}>
      {children}
    </main>
  );
}
