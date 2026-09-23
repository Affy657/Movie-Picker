import clsx from 'clsx';
import { avatarUrl } from '@/shared/utils/avatar';
import { initialsOf } from '@/shared/utils/initials';
import styles from './Avatar.module.css';

interface AvatarProps {
  avatarId: string | null | undefined;
  pseudo?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 56,
  xl: 96,
};

const PALETTE_SIZE = 8;

function paletteIndex(pseudo: string): number {
  return (pseudo.codePointAt(0) ?? 0) % PALETTE_SIZE;
}

export default function Avatar({
  avatarId,
  pseudo,
  size = 'md',
  className,
}: Readonly<AvatarProps>) {
  const px = SIZE_PX[size];

  if (!avatarId) {
    if (pseudo) {
      return (
        <span
          aria-hidden="true"
          className={clsx(styles.avatar, styles.initials, styles[size], className)}
          data-palette={paletteIndex(pseudo)}
        >
          <span className={styles.initialsText}>{initialsOf(pseudo)}</span>
        </span>
      );
    }
    return (
      <span
        aria-hidden="true"
        className={clsx(styles.avatar, styles[size], styles.placeholder, className)}
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
      className={clsx(styles.avatar, styles[size], className)}
      loading="lazy"
      decoding="async"
    />
  );
}
