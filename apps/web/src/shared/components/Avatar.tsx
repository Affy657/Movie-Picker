import clsx from 'clsx';
import { avatarUrl } from '@/shared/utils/avatar';
import styles from './Avatar.module.css';

interface AvatarProps {
  avatarId: string | null | undefined;
  pseudo?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 26,
  md: 36,
  lg: 56,
};

const INITIALS_COLORS = [
  '#3B82F6',
  '#7C3AED',
  '#06B6D4',
  '#EC4899',
  '#F97316',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
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
  return INITIALS_COLORS[idx] ?? '#3B82F6';
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
          {getInitials(pseudo)}
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
