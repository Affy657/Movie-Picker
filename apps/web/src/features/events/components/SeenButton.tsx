import clsx from 'clsx';
import { Eye } from 'lucide-react';
import AvatarStack from '@/shared/components/AvatarStack';
import Button from '@/shared/components/Button';
import Tooltip from '@/shared/components/Tooltip';
import type { MovieData } from '@/shared/types/movie';
import styles from './SeenButton.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import type { Translate } from '@/shared/i18n';

function SeenButton({
  m,
  iMarkedSeen,
  seenPending,
  onToggle,
  others = [],
  othersHint = null,
  avatarsByPseudo,
  framed = false,
  t,
}: Readonly<{
  m: MovieData;
  iMarkedSeen: boolean;
  seenPending: boolean;
  onToggle: () => void;
  others?: string[];
  othersHint?: string | null;
  avatarsByPseudo?: Record<string, string>;
  framed?: boolean;
  t: Translate;
}>) {
  const shared = {
    onClick: onToggle,
    disabled: seenPending,
    'aria-pressed': iMarkedSeen,
    'aria-label': iMarkedSeen
      ? t('movies.seen.unmarkAria', { title: m.title })
      : t('movies.seen.markAria', { title: m.title }),
    title: t('movies.seen.neutralTooltip'),
  };
  const icon = <Eye aria-hidden size={ICON_SIZE.md} />;

  if (framed) {
    return (
      <Button
        variant={iMarkedSeen ? 'soft' : 'secondary'}
        size="sm"
        className={styles.seenFramed}
        {...shared}
      >
        {icon}
      </Button>
    );
  }

  return (
    <span className={styles.seenWrap}>
      <button
        type="button"
        className={clsx(styles.seenBtn, iMarkedSeen && styles.seenActive)}
        {...shared}
      >
        {icon}
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
