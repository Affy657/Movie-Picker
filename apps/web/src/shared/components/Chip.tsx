import type { ComponentType, ReactNode, SVGProps } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Link } from 'react-router';
import styles from './Chip.module.css';
import { ICON_SIZE } from '@/shared/components/iconSize';
import StatusDot from './StatusDot';

export type ChipTone =
  'default' | 'primary' | 'success' | 'warning' | 'pending' | 'danger' | 'muted';

export type ChipSize = 'sm' | 'md';

const TONE_CLASS: Record<ChipTone, string | undefined> = {
  default: styles.toneDefault,
  primary: styles.tonePrimary,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  pending: styles.tonePending,
  danger: styles.toneDanger,
  muted: styles.toneMuted,
};

type ChipBaseProps = {
  tone?: ChipTone;
  size?: ChipSize;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  dashed?: boolean;
  dot?: boolean | 'pulsing';
  className?: string;
  'data-testid'?: string;
  children: ReactNode;
};

type ChipLabelProps = {
  onClick?: never;
  onRemove?: never;
  href?: never;
  ariaLabel?: never;
  selected?: never;
  disabled?: never;
  external?: never;
  removeAriaLabel?: never;
};

type ChipActionProps = {
  onClick: () => void;
  selected?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  onRemove?: never;
  href?: never;
  external?: never;
  removeAriaLabel?: never;
};

type ChipRemovableProps = {
  onRemove: () => void;
  removeAriaLabel: string;
  onClick?: never;
  href?: never;
  ariaLabel?: never;
  selected?: never;
  disabled?: never;
  external?: never;
};

type ChipLinkProps = {
  href: string;
  external?: boolean;
  ariaLabel?: string;
  onClick?: never;
  onRemove?: never;
  selected?: never;
  disabled?: never;
  removeAriaLabel?: never;
};

type ChipProps = ChipBaseProps &
  (ChipLabelProps | ChipActionProps | ChipRemovableProps | ChipLinkProps);

export default function Chip(props: Readonly<ChipProps>) {
  const {
    tone = 'default',
    size = 'md',
    icon: Icon,
    dashed = false,
    dot = false,
    className,
    'data-testid': testId,
    children,
  } = props;
  const interactive = props.onClick !== undefined || props.href !== undefined;
  const selected = props.onClick === undefined ? undefined : props.selected;
  const classes = clsx(
    styles.chip,
    TONE_CLASS[tone],
    size === 'sm' && styles.sm,
    dashed && styles.dashed,
    interactive && styles.interactive,
    selected && styles.selected,
    className
  );

  const content = (
    <>
      {dot ? <StatusDot pulsing={dot === 'pulsing'} /> : null}
      {Icon ? (
        <Icon
          className={styles.icon}
          width={ICON_SIZE.xs}
          height={ICON_SIZE.xs}
          aria-hidden="true"
        />
      ) : null}
      <span className={styles.text}>{children}</span>
      {props.onRemove === undefined ? null : (
        <button
          type="button"
          className={styles.remove}
          onClick={props.onRemove}
          aria-label={props.removeAriaLabel}
        >
          <X width={ICON_SIZE.xs} height={ICON_SIZE.xs} aria-hidden="true" />
        </button>
      )}
    </>
  );

  if (props.onClick !== undefined && props.onRemove === undefined) {
    return (
      <button
        type="button"
        className={classes}
        onClick={props.onClick}
        aria-label={props.ariaLabel}
        aria-pressed={selected}
        disabled={props.disabled ?? false}
        data-testid={testId}
      >
        {content}
      </button>
    );
  }

  if (props.href !== undefined && props.external) {
    return (
      <a
        className={classes}
        href={props.href}
        aria-label={props.ariaLabel}
        data-testid={testId}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  if (props.href !== undefined) {
    return (
      <Link className={classes} to={props.href} aria-label={props.ariaLabel} data-testid={testId}>
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} data-testid={testId}>
      {content}
    </span>
  );
}
