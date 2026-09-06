import clsx from 'clsx';
import type { CSSProperties, ReactNode, Ref } from 'react';

type PageLayoutProps = {
  children: ReactNode;

  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLElement>;
};

export default function PageLayout({ children, className, style, ref }: Readonly<PageLayoutProps>) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={clsx('page', className)}
      style={style}
      ref={ref}
    >
      {children}
    </main>
  );
}
