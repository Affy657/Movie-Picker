import clsx from 'clsx';
import { Users } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import { ICON_SIZE } from '@/shared/components/iconSize';
import styles from './GroupMosaic.module.css';

const MOSAIC_TILES = 4;

interface MosaicPerson {
  avatarId: string;
  displayName: string;
}

export default function GroupMosaic({
  people,
  size = 'md',
  className,
}: Readonly<{ people: readonly MosaicPerson[]; size?: 'md' | 'lg'; className?: string }>) {
  const tiles = people.slice(0, MOSAIC_TILES);
  return (
    <span
      className={clsx(styles.mosaic, size === 'lg' && styles.lg, className)}
      data-count={tiles.length}
      aria-hidden="true"
    >
      {tiles.length === 0 ? (
        <Users size={ICON_SIZE.lg} className={styles.empty} />
      ) : (
        tiles.map((person, index) => (
          <Avatar
            key={`${index}-${person.displayName}`}
            avatarId={person.avatarId}
            pseudo={person.displayName}
            size="sm"
            className={styles.tile}
          />
        ))
      )}
    </span>
  );
}
