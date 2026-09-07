import { Film } from 'lucide-react';
import styles from './MoviePosterCard.module.css';

interface Props {
  title: string;
  meta?: string;
  posterSrc?: string;
  rank?: number;
  rankLabel?: string;
  onSelect?: () => void;
  selectLabel?: string;
}

function PosterVisual({
  posterSrc,
  rank,
  rankLabel,
}: Readonly<Pick<Props, 'posterSrc' | 'rank' | 'rankLabel'>>) {
  return (
    <span className={styles.posterWrap}>
      {posterSrc ? (
        <img src={posterSrc} alt="" className={styles.poster} loading="lazy" decoding="async" />
      ) : (
        <span className={styles.posterPlaceholder} aria-hidden>
          <Film size={22} />
        </span>
      )}
      {rank != null ? (
        <span className={styles.rank}>
          {rankLabel ? <span className="visually-hidden">{rankLabel}</span> : null}
          <span className={styles.rankValue} aria-hidden={rankLabel ? true : undefined}>
            {rank}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export default function MoviePosterCard({
  title,
  meta,
  posterSrc,
  rank,
  rankLabel,
  onSelect,
  selectLabel,
}: Readonly<Props>) {
  const visual = <PosterVisual posterSrc={posterSrc} rank={rank} rankLabel={rankLabel} />;
  const body = (
    <>
      {visual}
      <span className={styles.cardTitle}>{title}</span>
      {meta ? <span className={styles.cardMeta}>{meta}</span> : null}
    </>
  );

  if (!onSelect) return <li className={styles.card}>{body}</li>;

  return (
    <li className={styles.card}>
      <button type="button" className={styles.cardButton} onClick={onSelect} title={selectLabel}>
        {body}
      </button>
    </li>
  );
}
