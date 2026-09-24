import clsx from 'clsx';
import Avatar from './Avatar';
import styles from './AvatarStack.module.css';

export interface AvatarStackPerson {
  key: string;
  avatarId: string | null | undefined;
  pseudo?: string;
}

interface AvatarStackProps {
  people: readonly AvatarStackPerson[];
  max?: number;
  hidden?: number;
  size?: 'xs' | 'sm';
  ariaLabel?: string;
  className?: string;
}

export default function AvatarStack({
  people,
  max = 3,
  hidden: hiddenOverride,
  size = 'xs',
  ariaLabel,
  className,
}: Readonly<AvatarStackProps>) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const hidden = hiddenOverride ?? people.length - shown.length;

  return (
    <span
      className={clsx(styles.stack, size === 'sm' && styles.sm, className)}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {ariaLabel ? <span className="visually-hidden">{ariaLabel}</span> : null}
      <span className={styles.faces} aria-hidden="true">
        {shown.map((person) => (
          <Avatar
            key={person.key}
            avatarId={person.avatarId}
            pseudo={person.pseudo}
            size={size}
            className={styles.item}
          />
        ))}
        {hidden > 0 ? (
          <span className={styles.more}>
            <span className={styles.moreText}>+{hidden}</span>
          </span>
        ) : null}
      </span>
    </span>
  );
}
