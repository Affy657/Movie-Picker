import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Skeleton.module.css';

type SkeletonVariant = 'text' | 'circle' | 'poster' | 'block';

type SkeletonProps = {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ variant, width, height, className, style }: SkeletonProps) {
  const variantClass = variant ? styles[variant] : undefined;
  const inlineStyle: CSSProperties = {
    ...(width != null ? { width: typeof width === 'number' ? `${width}px` : width } : null),
    ...(height != null ? { height: typeof height === 'number' ? `${height}px` : height } : null),
    ...style,
  };
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.skeleton, variantClass, className)}
      style={inlineStyle}
    />
  );
}

type SkeletonScreenProps = {
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function SkeletonScreen({ label, className, style, children }: SkeletonScreenProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className} style={style}>
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}
