import { splitOnMatch } from '@/features/profile/lib/highlightMatch';
import styles from './FollowListModal.module.css';

type Props = {
  value: string;
  highlight: string;
};

export default function HighlightedText({ value, highlight }: Readonly<Props>) {
  if (highlight.length === 0) return value;
  return splitOnMatch(value, highlight).map((segment, index) =>
    segment.matched ? (
      <mark key={index} className={styles.highlight}>
        {segment.text}
      </mark>
    ) : (
      <span key={index}>{segment.text}</span>
    )
  );
}
