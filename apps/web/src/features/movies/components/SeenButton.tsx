import clsx from 'clsx';
import { Eye } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Tooltip from '@/shared/components/Tooltip';
import type { Translate } from '@/features/movies/types';
import type { MovieData } from '@/shared/types/movie';
import styles from './SeenButton.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';

export function SeenButton({
  m,
  iMarkedSeen,
  seenPending,
  onToggle,
  others,
  othersHint,
  avatarsByPseudo,
  alwaysShowCount = false,
  t,
}: Readonly<{
  m: MovieData;
  iMarkedSeen: boolean;
  seenPending: boolean;
  onToggle: () => void;
  others: string[];
  othersHint: string | null;
  avatarsByPseudo?: Record<string, string>;
  alwaysShowCount?: boolean;
  t: Translate;
}>) {
  return (
    <span className={styles.seenWrap}>
      <button
        type="button"
        className={clsx(styles.seenBtn, iMarkedSeen && styles.seenActive)}
        onClick={onToggle}
        disabled={seenPending}
        aria-pressed={iMarkedSeen}
        aria-label={
          iMarkedSeen
            ? t('movies.seen.unmarkAria', { title: m.title })
            : t('movies.seen.markAria', { title: m.title })
        }
        title={t('movies.seen.neutralTooltip')}
      >
        <Eye aria-hidden size={ICON_SIZE.md} />
        <span className={styles.seenLabel}>
          {m.seenCount || alwaysShowCount
            ? t('movies.seen.labelWithCount', { count: m.seenCount ?? 0 })
            : t('movies.seen.label')}
        </span>
      </button>
      {othersHint && others.length > 0 && (
        <Tooltip label={othersHint}>
          <AvatarStack
            className={styles.seenAvatars}
            ariaLabel={othersHint}
            people={others.map((pseudo) => ({
              key: pseudo,
              avatarId: avatarsByPseudo?.[pseudo] ?? '',
              pseudo,
            }))}
          />
        </Tooltip>
      )}
    </span>
  );
}

export default SeenButton;
