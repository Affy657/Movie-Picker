import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'md' | 'lg';
export type CardElevation = 'none' | 'sm' | 'md' | 'lg';

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: CardPadding;
  radius?: CardRadius;
  elevation?: CardElevation;
  interactive?: boolean;
  children: ReactNode;
};

const PADDING_CLASS: Record<CardPadding, string | undefined> = {
  none: undefined,
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

const RADIUS_CLASS: Record<CardRadius, string | undefined> = {
  md: styles.radiusMd,
  lg: styles.radiusLg,
};

const ELEVATION_CLASS: Record<CardElevation, string | undefined> = {
  none: undefined,
  sm: styles.elevationSm,
  md: styles.elevationMd,
  lg: styles.elevationLg,
};

export default function Card({
  as: Tag = 'div',
  padding = 'md',
  radius = 'md',
  elevation = 'none',
  interactive = false,
  className,
  children,
  ...rest
}: Readonly<CardProps>) {
  return (
    <Tag
      className={clsx(
        styles.card,
        PADDING_CLASS[padding],
        RADIUS_CLASS[radius],
        ELEVATION_CLASS[elevation],
        interactive && styles.interactive,
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
