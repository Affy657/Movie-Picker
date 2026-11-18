import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import LinkButton from '@/shared/components/LinkButton';
import { ModalActions } from '@/shared/components/Modal';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import SearchField from '@/shared/components/SearchField';
import Spinner from '@/shared/components/Spinner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { useShareAction } from '@/shared/hooks/useShareAction';
import { useTranslation, type Translate } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import type { MovieListAudience, MovieListPerson } from '@/features/lists/api/listsApi';
import {
  listJoinFrontendUrl,
  type MovieListInviteLink,
  type MovieListMember,
  type MovieListMembers,
} from '@/features/lists/api/listMembersApi';
import {
  useInvitableUsers,
  useListMemberActions,
  useListMembers,
} from '@/features/lists/hooks/useListMembers';
import { normalizeListName } from '@/features/lists/utils/listName';
import { firstName } from '@/features/lists/utils/listMembers';
import styles from './ListMembersDialog.module.css';

type MemberActions = ReturnType<typeof useListMemberActions>;

interface MembersDialogList extends MovieListAudience {
  id: string;
  name: string;
}

function ownerFirst(members: readonly MovieListMember[]): MovieListMember[] {
  return [...members].sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
}

function matchesPerson(person: MovieListPerson, query: string): boolean {
  const needle = normalizeListName(query);
  if (!needle) return true;
  return [person.displayName, person.handle ?? ''].some((value) =>
    normalizeListName(value).includes(needle)
  );
}

function linkIsActive(link: MovieListInviteLink | null): link is MovieListInviteLink {
  return !!link?.active && new Date(link.expiresAt).getTime() > Date.now();
}

function formatValidUntil(expiresAt: string, locale: LocaleCode): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
    new Date(expiresAt)
  );
}

function handleLine(person: MovieListPerson): string | null {
  return person.handle ? `@${person.handle}` : null;
}

type RowRef = (element: HTMLLIElement | null) => void;

function useFocusAfterLeaving() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const rowRef =
    (userId: string): RowRef =>
    (element) => {
      if (element) rows.current.set(userId, element);
      else rows.current.delete(userId);
    };
  const focusAfter = (order: readonly string[], leavingId: string) => {
    const nextId = order[order.indexOf(leavingId) + 1];
    const nextRow = nextId === undefined ? undefined : rows.current.get(nextId);
    (nextRow ?? headingRef.current)?.focus();
  };
  return { headingRef, rowRef, focusAfter };
}

type LeavingFocus = ReturnType<typeof useFocusAfterLeaving>;

function PersonRow({
  person,
  name,
  detail,
  action,
  rowRef,
}: Readonly<{
  person: MovieListPerson;
  name: string;
  detail: string | null;
  action?: ReactNode;
  rowRef: RowRef;
}>) {
  return (
    <li ref={rowRef} tabIndex={-1} className={styles.row}>
      <Avatar avatarId={person.avatarId} pseudo={person.displayName} size="sm" />
      <span className={styles.rowText}>
        <span className={styles.rowName}>{name}</span>
        {detail ? <span className={styles.rowDetail}>{detail}</span> : null}
      </span>
      {action ? <span className={styles.rowAction}>{action}</span> : null}
    </li>
  );
}

function RemoveMemberAction({
  member,
  armed,
  pending,
  onArm,
  onDisarm,
  onConfirm,
  t,
}: Readonly<{
  member: MovieListMember;
  armed: boolean;
  pending: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onConfirm: () => void;
  t: Translate;
}>) {
  const name = member.displayName;
  return [
    armed ? (
      <Button
        key="keep"
        variant="ghost"
        size="sm"
        aria-label={t('lists.members.removeKeepAria', { name })}
        onClick={onDisarm}
      >
        {t('lists.members.removeKeep')}
      </Button>
    ) : null,
    <Button
      key="remove"
      variant={armed ? 'soft' : 'ghost'}
      tone="danger"
      size="sm"
      loading={pending}
      aria-label={
        armed
          ? t('lists.members.removeConfirmAria', { name })
          : t('lists.members.removeAria', { name })
      }
      onClick={armed ? onConfirm : onArm}
    >
      {armed ? t('lists.members.removeConfirm') : t('lists.members.remove')}
    </Button>,
  ];
}

function MembersSection({
  data,
  isOwner,
  viewerId,
  actions,
}: Readonly<{
  data: MovieListMembers;
  isOwner: boolean;
  viewerId: string | undefined;
  actions: MemberActions;
}>) {
  const { t } = useTranslation();
  const headingId = useId();
  const [armedId, setArmedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { removeMember, cancelInvitation } = actions;
  const focus = useFocusAfterLeaving();
  const members = ownerFirst(data.members);
  const order = [...members, ...data.invitations].map((person) => person.userId);

  const confirmRemoval = (member: MovieListMember) => {
    setError(null);
    removeMember.mutate(member.userId, {
      onSuccess: () => {
        setArmedId(null);
        focus.focusAfter(order, member.userId);
      },
      onError: (err) => setError(getErrorMessage(err, t('lists.members.removeError'))),
    });
  };
  const cancel = (person: MovieListPerson) => {
    setError(null);
    cancelInvitation.mutate(person.userId, {
      onSuccess: () => focus.focusAfter(order, person.userId),
      onError: (err) => setError(getErrorMessage(err, t('lists.members.cancelInvitationError'))),
    });
  };

  const memberAction = (member: MovieListMember): ReactNode => {
    if (member.isOwner) {
      return <span className={styles.rowTag}>{t('lists.members.ownerBadge')}</span>;
    }
    if (!isOwner || member.userId === viewerId) return null;
    return (
      <RemoveMemberAction
        member={member}
        armed={armedId === member.userId}
        pending={removeMember.isPending && removeMember.variables === member.userId}
        onArm={() => setArmedId(member.userId)}
        onDisarm={() => setArmedId(null)}
        onConfirm={() => confirmRemoval(member)}
        t={t}
      />
    );
  };

  return (
    <section className={styles.section}>
      <h3 id={headingId} ref={focus.headingRef} tabIndex={-1} className={styles.sectionLabel}>
        {t('lists.members.section')}
      </h3>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className={styles.rows} aria-labelledby={headingId}>
        {members.map((member) => (
          <PersonRow
            key={member.userId}
            rowRef={focus.rowRef(member.userId)}
            person={member}
            name={member.userId === viewerId ? t('lists.members.you') : member.displayName}
            detail={
              armedId === member.userId ? t('lists.members.removePrompt') : handleLine(member)
            }
            action={memberAction(member)}
          />
        ))}
        {data.invitations.map((invitation) => (
          <PersonRow
            key={invitation.userId}
            rowRef={focus.rowRef(invitation.userId)}
            person={invitation}
            name={invitation.displayName}
            detail={t('lists.members.invitationSent')}
            action={
              <Button
                variant="ghost"
                size="sm"
                loading={
                  cancelInvitation.isPending && cancelInvitation.variables === invitation.userId
                }
                aria-label={t('lists.members.cancelInvitationAria', {
                  name: invitation.displayName,
                })}
                onClick={() => cancel(invitation)}
              >
                {t('lists.members.cancelInvitation')}
              </Button>
            }
          />
        ))}
      </ul>
    </section>
  );
}

function InviteResults({
  users,
  full,
  actions,
  focus,
}: Readonly<{
  users: readonly MovieListPerson[];
  full: boolean;
  actions: MemberActions;
  focus: LeavingFocus;
}>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { invite } = actions;
  const visible = useMemo(() => users.filter((user) => matchesPerson(user, query)), [users, query]);
  const order = visible.map((person) => person.userId);

  const send = (person: MovieListPerson) => {
    setError(null);
    invite.mutate(person.userId, {
      onSuccess: () => focus.focusAfter(order, person.userId),
      onError: (err) => setError(getErrorMessage(err, t('lists.members.inviteError'))),
    });
  };

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={t('lists.members.searchPlaceholder')}
        ariaLabel={t('lists.members.searchLabel')}
      />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className={styles.hint}>{t('lists.members.noMatch', { query: query.trim() })}</p>
      ) : (
        <ul className={styles.results}>
          {visible.map((person) => (
            <PersonRow
              key={person.userId}
              rowRef={focus.rowRef(person.userId)}
              person={person}
              name={person.displayName}
              detail={handleLine(person)}
              action={
                <Button
                  size="sm"
                  disabled={full}
                  loading={invite.isPending && invite.variables === person.userId}
                  aria-label={t('lists.members.inviteAria', { name: person.displayName })}
                  onClick={() => send(person)}
                >
                  {t('lists.members.invite')}
                </Button>
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

function InviteSection({
  listId,
  data,
  actions,
}: Readonly<{ listId: string; data: MovieListMembers; actions: MemberActions }>) {
  const { t } = useTranslation();
  const invitable = useInvitableUsers(listId);
  const focus = useFocusAfterLeaving();
  const full = data.members.length + data.invitations.length >= data.maxMembers;
  const aloneInList = data.members.length <= 1 && data.invitations.length === 0;

  let body: ReactNode;
  if (invitable.isPending) {
    body = (
      <output className={styles.status}>
        <Spinner />
        <span className="visually-hidden">{t('lists.members.inviteLoading')}</span>
      </output>
    );
  } else if (invitable.isError) {
    body = (
      <InlineError
        message={t('lists.members.inviteLoadError')}
        retryLabel={t('lists.members.retry')}
        onRetry={() => void invitable.refetch()}
      />
    );
  } else if (invitable.data.length === 0) {
    body = (
      <p className={styles.hint}>
        {aloneInList ? t('lists.members.followsNobody') : t('lists.members.everyoneInvited')}
      </p>
    );
  } else {
    body = <InviteResults users={invitable.data} full={full} actions={actions} focus={focus} />;
  }

  return (
    <section className={styles.section}>
      <h3 ref={focus.headingRef} tabIndex={-1} className={styles.sectionLabel}>
        {t('lists.members.inviteSection')}
      </h3>
      {full ? (
        <p className={styles.notice}>{t('lists.members.full', { max: data.maxMembers })}</p>
      ) : null}
      {body}
    </section>
  );
}

function InviteLinkField({
  link,
  listName,
  onDisable,
  disabling,
}: Readonly<{
  link: MovieListInviteLink;
  listName: string;
  onDisable: () => void;
  disabling: boolean;
}>) {
  const { t, locale } = useTranslation();
  const url = listJoinFrontendUrl(link.token);
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    url,
    listName,
    undefined,
    'list'
  );
  return (
    <>
      <div className={styles.linkField}>
        <input
          className={styles.linkInput}
          readOnly
          value={url}
          aria-label={t('lists.members.linkLabel')}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button size="sm" variant="primary" onClick={() => void copyLink()}>
          {copied ? (
            <Check size={ICON_SIZE.sm} aria-hidden />
          ) : (
            <Copy size={ICON_SIZE.sm} aria-hidden />
          )}
          {copied ? t('lists.members.copied') : t('lists.members.copy')}
        </Button>
      </div>
      {canNativeShare ? (
        <Button fullWidth onClick={() => void nativeShare()}>
          <Share2 size={ICON_SIZE.md} aria-hidden />
          {t('lists.members.share')}
        </Button>
      ) : null}
      <p className={styles.hint}>
        {t('lists.members.linkValidUntil', { date: formatValidUntil(link.expiresAt, locale) })}{' '}
        <LinkButton size="sm" disabled={disabling} onClick={onDisable}>
          {t('lists.members.disableLink')}
        </LinkButton>
      </p>
      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? t('lists.members.copied') : ''}
      </span>
    </>
  );
}

function LinkSection({
  listName,
  link,
  actions,
}: Readonly<{ listName: string; link: MovieListInviteLink | null; actions: MemberActions }>) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { createLink, disableLink } = actions;
  const onError = (err: unknown) => setError(getErrorMessage(err, t('lists.members.linkError')));

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionLabel}>{t('lists.members.linkSection')}</h3>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {linkIsActive(link) ? (
        <InviteLinkField
          link={link}
          listName={listName}
          disabling={disableLink.isPending}
          onDisable={() => {
            setError(null);
            disableLink.mutate(undefined, { onError });
          }}
        />
      ) : (
        <>
          <Button
            loading={createLink.isPending}
            onClick={() => {
              setError(null);
              createLink.mutate(undefined, { onError });
            }}
          >
            <Link2 size={ICON_SIZE.md} aria-hidden />
            {t('lists.members.createLink')}
          </Button>
          <p className={styles.hint}>{t('lists.members.createLinkHint')}</p>
        </>
      )}
    </section>
  );
}

function MembersBody({
  list,
  isOwner,
  viewerId,
}: Readonly<{ list: MembersDialogList; isOwner: boolean; viewerId: string | undefined }>) {
  const { t } = useTranslation();
  const members = useListMembers(list.id);
  const actions = useListMemberActions(list.id);

  if (members.isPending) {
    return (
      <output className={styles.status}>
        <Spinner />
        <span className="visually-hidden">{t('lists.members.loading')}</span>
      </output>
    );
  }
  if (members.isError) {
    return (
      <InlineError
        message={t('lists.members.loadError')}
        retryLabel={t('lists.members.retry')}
        onRetry={() => void members.refetch()}
      />
    );
  }
  return (
    <>
      <MembersSection data={members.data} isOwner={isOwner} viewerId={viewerId} actions={actions} />
      {isOwner ? (
        <>
          <InviteSection listId={list.id} data={members.data} actions={actions} />
          <LinkSection listName={list.name} link={members.data.inviteLink} actions={actions} />
        </>
      ) : null}
    </>
  );
}

export default function ListMembersDialog({
  list,
  onClose,
}: Readonly<{ list: MembersDialogList; onClose: () => void }>) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOwner = list.role !== 'member';
  const help = isOwner
    ? t('lists.members.ownerHelp')
    : t('lists.members.memberHelp', { name: firstName(list.owner?.displayName ?? '') });

  return (
    <ResponsiveDialog
      open
      title={t('lists.members.title', { name: list.name })}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="primary" onClick={onClose}>
            {t('lists.members.done')}
          </Button>
        </ModalActions>
      }
    >
      <p className={styles.help}>{help}</p>
      <MembersBody list={list} isOwner={isOwner} viewerId={user?.userId} />
    </ResponsiveDialog>
  );
}
