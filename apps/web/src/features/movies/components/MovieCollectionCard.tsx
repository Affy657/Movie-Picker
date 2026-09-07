import { Link } from 'react-router';
import { Layers } from 'lucide-react';
import styles from './MovieCollectionCard.module.css';

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
      <Link to={to} className={styles.link}>
        <span className={styles.posterWrap}>
          {posterSrc ? (
            <img src={posterSrc} alt="" className={styles.poster} loading="lazy" decoding="async" />
          ) : (
            <span className={styles.posterPlaceholder} aria-hidden>
              <Layers size={20} />
            </span>
          )}
        </span>
        <span className={styles.body}>
          <span className={styles.name}>{name}</span>
          <span className={styles.count}>{movieCountLabel}</span>
        </span>
      </Link>
    </li>
  );
}
