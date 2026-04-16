import clsx from 'clsx';
import type { CSSProperties, ReactNode } from 'react';
import styles from './Skeleton.module.css';

type SkeletonVariant = 'text' | 'circle' | 'poster' | 'block';

type SkeletonProps = {
  /** Forme par défaut — définit aspect-ratio / border-radius / hauteur. */
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Bloc de chargement animé (shimmer). Purement visuel ;
 * l'annonce lecteur d'écran est portée par le conteneur parent via
 * `role="status" aria-busy="true"` et un texte `visually-hidden`.
 *
 * L'animation est désactivée pour `prefers-reduced-motion: reduce`.
 */
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
  /** Libellé pour lecteurs d'écran (annoncé une fois par écran). */
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/**
 * Conteneur accessible pour un ensemble de skeletons — pose `role="status"`
 * (region polie) et un libellé caché pour les lecteurs d'écran. Les enfants
 * `<Skeleton />` sont `aria-hidden` pour éviter le bruit.
 */
export function SkeletonScreen({ label, className, style, children }: SkeletonScreenProps) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className} style={style}>
      <span className="visually-hidden">{label}</span>
      {children}
    </div>
  );
}
