import { useState, type ReactNode } from 'react';
import { ChevronDown, ListChecks, ListPlus, Plus } from 'lucide-react';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import Sheet from '@/shared/components/Sheet';
import Spinner from '@/shared/components/Spinner';
import {
  MenuCheckboxItem,
  MenuItem,
  MenuLabel,
  MenuPanel,
  MenuSeparator,
} from '@/shared/components/Menu';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { useMenuState } from '@/shared/hooks/useMenuState';
import { useTranslation, type Translate } from '@/shared/i18n';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MovieListItemBody, MovieListSummary } from '@/features/lists/api/listsApi';
import ListFormDialog from '@/features/lists/components/ListFormDialog';
import { useListMembershipToggle } from '@/features/lists/hooks/useLists';
import { listCountLabel } from '@/features/lists/utils/listCount';
import { listCompanionLabel } from '@/features/lists/utils/listMembers';
import styles from './AddToListMenu.module.css';

function triggerLabel(count: number, t: Translate): string {
  if (count === 0) return t('lists.addTo.trigger');
  if (count === 1) return t('lists.addTo.inOne');
  return t('lists.addTo.inMany', { count });
}

function listDescription(
  list: MovieListSummary,
  viewerId: string | undefined,
  t: Translate
): string {
  return [listCountLabel(list.itemCount, t), listCompanionLabel(list, viewerId, t)]
    .filter(Boolean)
    .join(', ');
}

function ListChoices({
  lists,
  onToggle,
  onCreate,
  t,
}: Readonly<{
  lists: MovieListSummary[];
  onToggle: (listId: string) => void;
  onCreate: () => void;
  t: Translate;
}>) {
  const { user } = useAuth();
  return (
    <>
      {lists.map((list) => (
        <MenuCheckboxItem
          key={list.id}
          checked={list.containsMovie}
          onChange={() => onToggle(list.id)}
          description={listDescription(list, user?.userId, t)}
        >
          {list.name}
        </MenuCheckboxItem>
      ))}
      <MenuSeparator />
      <MenuItem icon={<Plus aria-hidden size={ICON_SIZE.md} />} onClick={onCreate}>
        {t('lists.addTo.newList')}
      </MenuItem>
    </>
  );
}

function MenuStatus({
  isLoading,
  isError,
  error,
  onRetry,
  t,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  onRetry: () => void;
  t: Translate;
}>) {
  if (isLoading) {
    return (
      <output className={styles.status}>
        <Spinner />
        <span className="visually-hidden">{t('lists.addTo.loading')}</span>
      </output>
    );
  }
  if (isError) {
    return (
      <InlineError
        message={t('lists.addTo.loadError')}
        retryLabel={t('lists.addTo.retry')}
        onRetry={onRetry}
      />
    );
  }
  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  }
  return null;
}

type Membership = ReturnType<typeof useListMembershipToggle>;

interface ListsControlProps {
  membership: Membership;
  title: string;
  label: ReactNode;
  variant: (open: boolean) => 'soft' | 'secondary';
  disabled: boolean;
  fullWidth: boolean;
  onCreate: () => void;
}

function membershipReady(membership: Membership): boolean {
  return !membership.isLoading && !membership.isError;
}

function MobileListsSheet({
  membership,
  title,
  label,
  variant,
  disabled,
  fullWidth,
  onCreate,
}: Readonly<ListsControlProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ready = membershipReady(membership);
  const hasLists = membership.lists.length > 0;
  const offerCreate = ready && !hasLists;
  const create = () => {
    setOpen(false);
    onCreate();
  };
  return (
    <>
      <Button
        variant={variant(open)}
        fullWidth={fullWidth}
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Sheet
        open={open}
        title={title}
        onClose={() => setOpen(false)}
        footer={
          <Button variant="primary" fullWidth onClick={offerCreate ? create : () => setOpen(false)}>
            {offerCreate ? t('lists.addTo.emptyCta') : t('lists.addTo.done')}
          </Button>
        }
      >
        <MenuStatus
          isLoading={membership.isLoading}
          isError={membership.isError}
          error={membership.error}
          onRetry={membership.retry}
          t={t}
        />
        {offerCreate ? <p className={styles.empty}>{t('lists.addTo.emptyMessage')}</p> : null}
        {ready && hasLists ? (
          <MenuPanel ariaLabel={title} anchored={false} embedded>
            <ListChoices
              lists={membership.lists}
              onToggle={membership.toggle}
              onCreate={create}
              t={t}
            />
          </MenuPanel>
        ) : null}
      </Sheet>
    </>
  );
}

function DesktopListsMenu({
  membership,
  title,
  label,
  variant,
  disabled,
  onCreate,
}: Readonly<ListsControlProps>) {
  const { t } = useTranslation();
  const menu = useMenuState({ align: 'left' });
  const ready = membershipReady(membership);
  const hasLists = membership.lists.length > 0;
  const create = () => {
    menu.close();
    onCreate();
  };
  return (
    <div ref={menu.containerRef} className={styles.container}>
      <Button {...menu.triggerProps} variant={variant(menu.open)} disabled={disabled}>
        {label}
      </Button>
      {menu.open ? (
        <MenuPanel {...menu.panelProps} ariaLabel={title} className={styles.panel}>
          <MenuLabel>{title}</MenuLabel>
          <MenuStatus
            isLoading={membership.isLoading}
            isError={membership.isError}
            error={membership.error}
            onRetry={membership.retry}
            t={t}
          />
          {ready && hasLists ? (
            <ListChoices
              lists={membership.lists}
              onToggle={membership.toggle}
              onCreate={create}
              t={t}
            />
          ) : null}
          {ready && !hasLists ? (
            <>
              <p className={styles.empty}>{t('lists.addTo.emptyMessage')}</p>
              <MenuItem icon={<Plus aria-hidden size={ICON_SIZE.md} />} onClick={create}>
                {t('lists.addTo.emptyCta')}
              </MenuItem>
            </>
          ) : null}
        </MenuPanel>
      ) : null}
    </div>
  );
}

interface AddToListMenuProps {
  item: MovieListItemBody;
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function AddToListMenu({
  item,
  disabled = false,
  fullWidth = false,
}: Readonly<AddToListMenuProps>) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [createOpen, setCreateOpen] = useState(false);
  const membership = useListMembershipToggle(item, true);
  const { count } = membership;
  const Icon = count > 0 ? ListChecks : ListPlus;
  const Control = isMobile ? MobileListsSheet : DesktopListsMenu;

  return (
    <>
      <Control
        membership={membership}
        title={t('lists.addTo.title')}
        label={
          <>
            <Icon aria-hidden size={ICON_SIZE.md} />
            {triggerLabel(count, t)}
            <ChevronDown aria-hidden size={ICON_SIZE.sm} />
          </>
        }
        variant={(open) => (count > 0 || open ? 'soft' : 'secondary')}
        disabled={disabled}
        fullWidth={fullWidth}
        onCreate={() => setCreateOpen(true)}
      />
      {createOpen ? (
        <ListFormDialog
          mode="createAndAdd"
          item={item}
          knownLists={membership.lists}
          onClose={() => setCreateOpen(false)}
          onSaved={() => setCreateOpen(false)}
        />
      ) : null}
    </>
  );
}
