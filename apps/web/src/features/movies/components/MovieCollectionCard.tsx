import type { ReactNode } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { ChevronRight, Layers } from 'lucide-react';
import styles from './MovieCollectionCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Card from '@/shared/components/Card';
import PosterFan from '@/features/movies/components/PosterFan';

const STACK_SLOTS = [styles.stackFront, styles.stackMiddle, styles.stackBack];

interface Props {
  to: string;
  name: string;
  movieCountLabel: string;
  posterSrc?: string;
  stackSrcs?: readonly string[];
  badgeIcon?: ReactNode;
  extra?: ReactNode;
  layout?: 'stack' | 'row';
  progress?: number | null;
  nameSuffix?: ReactNode;
  emptyIcon?: ReactNode;
}

interface CollectionStackProps {
  to: string;
  name: string;
  movieCountLabel: string;
  srcs: readonly string[];
  badgeIcon?: ReactNode;
  extra?: ReactNode;
}

interface CollectionRowProps {
  to: string;
  name: string;
  movieCountLabel: string;
  srcs: readonly string[];
  extra?: ReactNode;
  progress?: number | null;
  nameSuffix?: ReactNode;
  emptyIcon?: ReactNode;
}

function CollectionRow({
  to,
  name,
  movieCountLabel,
  srcs,
  extra,
  progress,
  nameSuffix,
  emptyIcon,
}: Readonly<CollectionRowProps>) {
  return (
    <li className={styles.rowItem}>
      <Link to={to} className={styles.row}>
        <PosterFan
          srcs={srcs}
          progress={progress}
          emptyIcon={emptyIcon ?? <Layers size={ICON_SIZE.lg} />}
        />
        <span className={styles.rowText}>
          <span className={styles.rowName}>
            <span className={styles.rowNameText}>{name}</span>
            {nameSuffix}
          </span>
          <span className={styles.rowCount}>{movieCountLabel}</span>
          {extra ? <span className={styles.rowExtra}>{extra}</span> : null}
        </span>
        <ChevronRight className={styles.rowChevron} size={ICON_SIZE.lg} aria-hidden />
      </Link>
    </li>
  );
}

function CollectionStack({
  to,
  name,
  movieCountLabel,
  srcs,
  badgeIcon,
  extra,
}: Readonly<CollectionStackProps>) {
  return (
    <li className={styles.card}>
      <Link to={to} className={styles.stackLink}>
        <span className={styles.stack} data-count={srcs.length}>
          {badgeIcon ? (
            <span className={styles.stackBadge} aria-hidden>
              {badgeIcon}
            </span>
          ) : null}
          {srcs.length === 0 ? (
            <span className={clsx(styles.stackPoster, styles.stackFront)} aria-hidden>
              <Layers size={ICON_SIZE.xl} />
            </span>
          ) : (
            srcs.map((src, index) => (
              <img
                key={`${index}-${src}`}
                src={src}
                alt=""
                className={clsx(styles.stackPoster, STACK_SLOTS[index])}
                loading="lazy"
                decoding="async"
              />
            ))
          )}
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.count}>{movieCountLabel}</span>
        {extra ? <span className={styles.extra}>{extra}</span> : null}
      </Link>
    </li>
  );
}

export default function MovieCollectionCard({
  to,
  name,
  movieCountLabel,
  posterSrc,
  stackSrcs,
  badgeIcon,
  extra,
  layout = 'stack',
  progress,
  nameSuffix,
  emptyIcon,
}: Readonly<Props>) {
  if (stackSrcs && layout === 'row') {
    return (
      <CollectionRow
        to={to}
        name={name}
        movieCountLabel={movieCountLabel}
        srcs={stackSrcs}
        extra={extra}
        progress={progress}
        nameSuffix={nameSuffix}
        emptyIcon={emptyIcon}
      />
    );
  }
  if (stackSrcs) {
    return (
      <CollectionStack
        to={to}
        name={name}
        movieCountLabel={movieCountLabel}
        srcs={stackSrcs}
        badgeIcon={badgeIcon}
        extra={extra}
      />
    );
  }
  return (
    <li className={styles.card}>
      <Card as={Link} to={to} interactive padding="none" surface="sunken" className={styles.link}>
        <span className={styles.posterWrap}>
          {posterSrc ? (
            <img src={posterSrc} alt="" className={styles.poster} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.posterPlaceholder} aria-hidden>
              <Layers size={ICON_SIZE.xl} />
            </span>
          )}
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{name}</span>
          <span className={styles.count}>{movieCountLabel}</span>
        </span>
      </Card>
    </li>
  );
}
