import clsx from 'clsx';
import { avatarUrl } from '@/shared/utils/avatar';
import styles from './Avatar.module.css';

interface AvatarProps {
  avatarId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 20,
  sm: 26,
  md: 36,
  lg: 56,
};

export default function Avatar({ avatarId, size = 'md', className }: AvatarProps) {
  const px = SIZE_PX[size];

  if (!avatarId) {
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
