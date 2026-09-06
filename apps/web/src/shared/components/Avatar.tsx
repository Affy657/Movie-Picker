import clsx from 'clsx';
import { avatarUrl } from '@/shared/utils/avatar';
import styles from './Avatar.module.css';

interface AvatarProps {
  avatarId: string | null | undefined;
  pseudo?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 26,
  md: 36,
  lg: 56,
  xl: 96,
};

const INITIALS_COLORS = [
  '#1D4ED8',
  '#6D28D9',
  '#0E7490',
  '#BE185D',
  '#C2410C',
  '#047857',
  '#B91C1C',
  '#7E22CE',
];

function getInitials(pseudo: string): string {
  const parts = pseudo.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  if (a && b) return (a + b).toUpperCase();
  return pseudo.slice(0, 2).toUpperCase();
}

function initialsColor(pseudo: string): string {
  const idx = (pseudo.codePointAt(0) ?? 0) % INITIALS_COLORS.length;
  return INITIALS_COLORS[idx] ?? '#1D4ED8';
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
          style={{ width: px, height: px, background: initialsColor(pseudo) }}
        >
          <span className={styles.initialsText}>{getInitials(pseudo)}</span>
        </span>
      );
    }
    return (
      <span
        aria-hidden="true"
        className={clsx(styles.avatar, styles[size], styles.placeholder, className)}
        style={{ width: px, height: px }}
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
