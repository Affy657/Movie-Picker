import { useState } from 'react';
import clsx from 'clsx';
import type { AccentColor } from '@/shared/types/theme';
import { accentZoneClass, isChosenAccent } from '@/shared/utils/accentColor';
import { avatarPaletteIndex, avatarUrl } from '@/shared/utils/avatar';
import { initialsOf } from '@/shared/utils/initials';
import styles from './Avatar.module.css';

interface AvatarProps {
  avatarId: string | null | undefined;
  pseudo?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
  accent?: AccentColor | null;
}

function accentRingClass(accent: AccentColor | null | undefined): string | undefined {
  return isChosenAccent(accent) ? clsx(accentZoneClass(accent), styles.accentRing) : undefined;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 56,
  xl: 96,
};

export default function Avatar({
  avatarId,
  pseudo,
  size = 'md',
  className,
  priority = false,
  accent,
}: Readonly<AvatarProps>) {
  const px = SIZE_PX[size];
  const [failedAvatarId, setFailedAvatarId] = useState<string | null>(null);
  const ring = accentRingClass(accent);

  if (!avatarId || failedAvatarId === avatarId) {
    if (pseudo) {
      return (
        <span
          aria-hidden="true"
          className={clsx(styles.avatar, styles.initials, styles[size], ring, className)}
          data-palette={avatarPaletteIndex(pseudo)}
        >
          <span className={styles.initialsText}>{initialsOf(pseudo)}</span>
        </span>
      );
    }
    return (
      <span
        aria-hidden="true"
        className={clsx(styles.avatar, styles[size], styles.placeholder, ring, className)}
      />
    );
  }

  return (
    <img
      src={avatarUrl(avatarId)}
      alt=""
      aria-hidden="true"
      width={px}
      height={px}
      className={clsx(styles.avatar, styles[size], ring, className)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={() => setFailedAvatarId(avatarId)}
    />
  );
}
