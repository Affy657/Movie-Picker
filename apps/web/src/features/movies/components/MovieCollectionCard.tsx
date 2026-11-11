import { Link } from 'react-router';
import clsx from 'clsx';
import { Layers } from 'lucide-react';
import styles from './MovieCollectionCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Card from '@/shared/components/Card';

const STACK_SLOTS = [styles.stackFront, styles.stackMiddle, styles.stackBack];

interface Props {
  to: string;
  name: string;
  movieCountLabel: string;
  posterSrc?: string;
  stackSrcs?: readonly string[];
}

function CollectionStack({
  to,
  name,
  movieCountLabel,
  srcs,
}: Readonly<{ to: string; name: string; movieCountLabel: string; srcs: readonly string[] }>) {
  return (
    <li className={styles.card}>
      <Link to={to} className={styles.stackLink}>
        <span className={styles.stack} data-count={srcs.length}>
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
}: Readonly<Props>) {
  if (stackSrcs) {
    return (
      <CollectionStack to={to} name={name} movieCountLabel={movieCountLabel} srcs={stackSrcs} />
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
