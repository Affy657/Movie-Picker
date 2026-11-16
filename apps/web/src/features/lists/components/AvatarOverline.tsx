import type { ReactNode } from 'react';
import Avatar from '@/shared/components/Avatar';
import styles from './AvatarOverline.module.css';

export default function AvatarOverline({
  avatarId,
  pseudo,
  children,
}: Readonly<{ avatarId: string | null; pseudo: string; children: ReactNode }>) {
  return (
    <>
      <Avatar avatarId={avatarId} pseudo={pseudo} size="xs" />
      <span className={styles.text}>{children}</span>
    </>
  );
}
