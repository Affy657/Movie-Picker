import { splitOnMatch } from '@/features/profile/lib/highlightMatch';
import styles from './FollowListModal.module.css';

type Props = {
  value: string;
  highlight: string;
};

export default function HighlightedText({ value, highlight }: Readonly<Props>) {
  if (highlight.length === 0) return value;
  let offset = 0;
  return splitOnMatch(value, highlight).map((segment) => {
    const key = `${offset}-${segment.text}`;
    offset += segment.text.length;
    return segment.matched ? (
      <mark key={key} className={styles.highlight}>
        {segment.text}
      </mark>
    ) : (
      <span key={key}>{segment.text}</span>
    );
  });
}
