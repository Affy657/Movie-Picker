import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: CardPadding;
  elevated?: boolean;
  interactive?: boolean;
  children: ReactNode;
};

export default function Card({
  as: Tag = 'div',
  padding = 'md',
  elevated = false,
  interactive = false,
  className,
  children,
  ...rest
}: Readonly<CardProps>) {
  return (
    <Tag
      className={clsx(
        styles.card,
        styles[padding],
        elevated && styles.elevated,
        interactive && styles.interactive,
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
