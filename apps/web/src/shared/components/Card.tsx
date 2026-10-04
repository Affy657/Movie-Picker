import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'md' | 'lg';
export type CardElevation = 'none' | 'sm' | 'md' | 'lg';
export type CardSurface = 'default' | 'sunken';

type CardOwnProps<T extends ElementType> = {
  as?: T;
  padding?: CardPadding;
  radius?: CardRadius;
  elevation?: CardElevation;
  surface?: CardSurface;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
};

type CardProps<T extends ElementType> = CardOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof CardOwnProps<T>>;

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

export default function Card<T extends ElementType = 'div'>(props: Readonly<CardProps<T>>) {
  const {
    as,
    padding = 'md',
    radius = 'md',
    elevation = 'none',
    surface = 'default',
    interactive = false,
    className,
    children,
    ...rest
  } = props as CardOwnProps<T> & Record<string, unknown>;
  const Tag: ElementType = as ?? 'div';
  return (
    <Tag
      className={clsx(
        styles.card,
        PADDING_CLASS[padding],
        RADIUS_CLASS[radius],
        ELEVATION_CLASS[elevation],
        surface === 'sunken' && styles.sunken,
        interactive && styles.interactive,
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
