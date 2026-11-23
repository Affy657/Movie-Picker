import { useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ROUTES, withReturnTo } from '@/app/routes';
import { useEverOpened } from '@/shared/hooks/useEverOpened';
import AccountChoiceLinks from './AccountChoiceLinks';
import ResponsiveDialog from './ResponsiveDialog';
import styles from './AccountPromptLink.module.css';

type AccountPromptLinkProps = {
  returnTo: string;
  title: string;
  message: string;
  className: string;
  ariaLabel?: string;
  children: ReactNode;
};

function opensInPlace(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function AccountPromptLink({
  returnTo,
  title,
  message,
  className,
  ariaLabel,
  children,
}: Readonly<AccountPromptLinkProps>) {
  const [open, setOpen] = useState(false);
  const everOpened = useEverOpened(open);

  return (
    <>
      <Link
        to={withReturnTo(ROUTES.register, returnTo)}
        className={className}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={(event) => {
          if (!opensInPlace(event)) return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {everOpened ? (
        <ResponsiveDialog open={open} title={title} onClose={() => setOpen(false)}>
          <p className={styles.message}>{message}</p>
          <div className={styles.actions}>
            <AccountChoiceLinks returnTo={returnTo} fullWidth />
          </div>
        </ResponsiveDialog>
      ) : null}
    </>
  );
}
