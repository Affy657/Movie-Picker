import { Link } from 'react-router';
import { Layers } from 'lucide-react';
import styles from './MovieCollectionCard.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import Card from '@/shared/components/Card';

interface Props {
  to: string;
  name: string;
  movieCountLabel: string;
  posterSrc?: string;
}

export default function MovieCollectionCard({
  to,
  name,
  movieCountLabel,
  posterSrc,
}: Readonly<Props>) {
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
