import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import Avatar from '@/shared/components/Avatar';
import Button from '@/shared/components/Button';
import InlineError from '@/shared/components/InlineError';
import LinkButton from '@/shared/components/LinkButton';
import { ModalActions } from '@/shared/components/Modal';
import PersonRow from '@/shared/components/PersonRow';
import ResponsiveDialog from '@/shared/components/ResponsiveDialog';
import SearchField from '@/shared/components/SearchField';
import Spinner from '@/shared/components/Spinner';
import { ICON_SIZE } from '@/shared/components/iconSize';
import { getErrorMessage } from '@/shared/api/apiError';
import { useShareAction, type ShareSurface } from '@/shared/hooks/useShareAction';
import { useTranslation } from '@/shared/i18n';
import type { LocaleCode } from '@/shared/i18n/locales';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { normalizeListName } from '@/features/library/utils/listName';
import styles from './MembersDialog.module.css';

export type MembersCopy = 'lists.members' | 'groups.members';

type MembersCopyKey =
  | 'section'
  | 'you'
  | 'ownerBadge'
  | 'invitationSent'
  | 'cancelInvitation'
  | 'cancelInvitationAria'
  | 'cancelInvitationError'
  | 'remove'
  | 'removeAria'
  | 'removePrompt'
  | 'removeConfirm'
  | 'removeConfirmAria'
  | 'removeKeep'
  | 'removeKeepAria'
  | 'removeError'
  | 'inviteSection'
  | 'searchLabel'
  | 'searchPlaceholder'
  | 'invite'
  | 'inviteAria'
  | 'inviteError'
  | 'inviteLoading'
  | 'inviteLoadError'
  | 'followsNobody'
  | 'everyoneInvited'
  | 'noMatch'
  | 'full'
  | 'linkSection'
  | 'linkLabel'
  | 'copy'
  | 'copied'
  | 'share'
  | 'linkValidUntil'
  | 'disableLink'
  | 'createLink'
  | 'createLinkHint'
  | 'linkError'
  | 'loading'
  | 'loadError'
  | 'retry'
  | 'done';

type MembersTranslate = (key: MembersCopyKey, vars?: Record<string, string | number>) => string;

export interface MembersPerson {
  userId: string;
  handle: string | null;
  displayName: string;
  avatarId: string;
}

export interface MembersRosterMember extends MembersPerson {
  isOwner: boolean;
}

export interface MembersInviteLink {
  token: string;
  expiresAt: string;
  active: boolean;
}

export interface MembersRoster {
  maxMembers: number;
  members: readonly MembersRosterMember[];
  invitations: readonly MembersPerson[];
  inviteLink: MembersInviteLink | null;
}

type MembersMutation<TVariables> = UseMutationResult<unknown, Error, TVariables>;

export interface MembersActions {
  invite: MembersMutation<string>;
  cancelInvitation: MembersMutation<string>;
  removeMember: MembersMutation<string>;
  createLink: MembersMutation<void>;
  disableLink: MembersMutation<void>;
}

export interface MembersInviteTarget {
  url: (token: string) => string;
  shareTitle: string;
  surface: ShareSurface;
}

function useMembersCopy(copy: MembersCopy): MembersTranslate {
  const { t } = useTranslation();
  return useCallback((key, vars) => t(`${copy}.${key}` as const, vars), [t, copy]);
}

function ownerFirst(members: readonly MembersRosterMember[]): MembersRosterMember[] {
  return [...members].sort((a, b) => Number(b.isOwner) - Number(a.isOwner));
}

function matchesPerson(person: MembersPerson, query: string): boolean {
  const needle = normalizeListName(query);
  if (!needle) return true;
  return [person.displayName, person.handle ?? ''].some((value) =>
    normalizeListName(value).includes(needle)
  );
}

function linkIsActive(link: MembersInviteLink | null): link is MembersInviteLink {
  return !!link?.active && new Date(link.expiresAt).getTime() > Date.now();
}

function formatValidUntil(expiresAt: string, locale: LocaleCode): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
    new Date(expiresAt)
  );
}

function handleLine(person: MembersPerson): string | null {
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

function MemberRow({
  person,
  name,
  detail,
  action,
  rowRef,
}: Readonly<{
  person: MembersPerson;
  name: string;
  detail: string | null;
  action?: ReactNode;
  rowRef: RowRef;
}>) {
  return (
    <PersonRow
      rowRef={rowRef}
      tabIndex={-1}
      avatar={<Avatar avatarId={person.avatarId} pseudo={person.displayName} size="md" />}
      name={name}
      detail={detail}
      action={action}
    />
  );
}

function RemoveMemberAction({
  member,
  armed,
  pending,
  onArm,
  onDisarm,
  onConfirm,
  tm,
}: Readonly<{
  member: MembersRosterMember;
  armed: boolean;
  pending: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onConfirm: () => void;
  tm: MembersTranslate;
}>) {
  const name = member.displayName;
  return [
    armed ? (
      <Button
        key="keep"
        variant="ghost"
        size="sm"
        aria-label={tm('removeKeepAria', { name })}
        onClick={onDisarm}
      >
        {tm('removeKeep')}
      </Button>
    ) : null,
    <Button
      key="remove"
      variant={armed ? 'soft' : 'ghost'}
      tone="danger"
      size="sm"
      loading={pending}
      aria-label={armed ? tm('removeConfirmAria', { name }) : tm('removeAria', { name })}
      onClick={armed ? onConfirm : onArm}
    >
      {armed ? tm('removeConfirm') : tm('remove')}
    </Button>,
  ];
}

function MembersSection({
  data,
  isOwner,
  viewerId,
  actions,
  tm,
}: Readonly<{
  data: MembersRoster;
  isOwner: boolean;
  viewerId: string | undefined;
  actions: MembersActions;
  tm: MembersTranslate;
}>) {
  const headingId = useId();
  const [armedId, setArmedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { removeMember, cancelInvitation } = actions;
  const focus = useFocusAfterLeaving();
  const members = ownerFirst(data.members);
  const order = [...members, ...data.invitations].map((person) => person.userId);

  const confirmRemoval = (member: MembersRosterMember) => {
    setError(null);
    removeMember.mutate(member.userId, {
      onSuccess: () => {
        setArmedId(null);
        focus.focusAfter(order, member.userId);
      },
      onError: (err) => setError(getErrorMessage(err, tm('removeError'))),
    });
  };
  const cancel = (person: MembersPerson) => {
    setError(null);
    cancelInvitation.mutate(person.userId, {
      onSuccess: () => focus.focusAfter(order, person.userId),
      onError: (err) => setError(getErrorMessage(err, tm('cancelInvitationError'))),
    });
  };

  const memberAction = (member: MembersRosterMember): ReactNode => {
    if (member.isOwner) {
      return <span className={styles.rowTag}>{tm('ownerBadge')}</span>;
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
        tm={tm}
      />
    );
  };

  return (
    <section className={styles.section}>
      <h3 id={headingId} ref={focus.headingRef} tabIndex={-1} className={styles.sectionLabel}>
        {tm('section')}
      </h3>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className={styles.rows} aria-labelledby={headingId}>
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            rowRef={focus.rowRef(member.userId)}
            person={member}
            name={member.userId === viewerId ? tm('you') : member.displayName}
            detail={armedId === member.userId ? tm('removePrompt') : handleLine(member)}
            action={memberAction(member)}
          />
        ))}
        {data.invitations.map((invitation) => (
          <MemberRow
            key={invitation.userId}
            rowRef={focus.rowRef(invitation.userId)}
            person={invitation}
            name={invitation.displayName}
            detail={tm('invitationSent')}
            action={
              <Button
                variant="ghost"
                size="sm"
                loading={
                  cancelInvitation.isPending && cancelInvitation.variables === invitation.userId
                }
                aria-label={tm('cancelInvitationAria', { name: invitation.displayName })}
                onClick={() => cancel(invitation)}
              >
                {tm('cancelInvitation')}
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
  tm,
}: Readonly<{
  users: readonly MembersPerson[];
  full: boolean;
  actions: MembersActions;
  focus: LeavingFocus;
  tm: MembersTranslate;
}>) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { invite } = actions;
  const visible = useMemo(() => users.filter((user) => matchesPerson(user, query)), [users, query]);
  const order = visible.map((person) => person.userId);

  const send = (person: MembersPerson) => {
    setError(null);
    invite.mutate(person.userId, {
      onSuccess: () => focus.focusAfter(order, person.userId),
      onError: (err) => setError(getErrorMessage(err, tm('inviteError'))),
    });
  };

  return (
    <>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder={tm('searchPlaceholder')}
        ariaLabel={tm('searchLabel')}
      />
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className={styles.hint}>{tm('noMatch', { query: query.trim() })}</p>
      ) : (
        <ul className={styles.results}>
          {visible.map((person) => (
            <MemberRow
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
                  aria-label={tm('inviteAria', { name: person.displayName })}
                  onClick={() => send(person)}
                >
                  {tm('invite')}
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
  data,
  invitable,
  actions,
  tm,
}: Readonly<{
  data: MembersRoster;
  invitable: UseQueryResult<readonly MembersPerson[], Error>;
  actions: MembersActions;
  tm: MembersTranslate;
}>) {
  const focus = useFocusAfterLeaving();
  const full = data.members.length + data.invitations.length >= data.maxMembers;
  const aloneInList = data.members.length <= 1 && data.invitations.length === 0;

  let body: ReactNode;
  if (invitable.isPending) {
    body = (
      <output className={styles.status}>
        <Spinner />
        <span className="visually-hidden">{tm('inviteLoading')}</span>
      </output>
    );
  } else if (invitable.isError) {
    body = (
      <InlineError
        message={tm('inviteLoadError')}
        retryLabel={tm('retry')}
        onRetry={() => void invitable.refetch()}
      />
    );
  } else if (invitable.data.length === 0) {
    body = (
      <p className={styles.hint}>{aloneInList ? tm('followsNobody') : tm('everyoneInvited')}</p>
    );
  } else {
    body = (
      <InviteResults users={invitable.data} full={full} actions={actions} focus={focus} tm={tm} />
    );
  }

  return (
    <section className={styles.section}>
      <h3 ref={focus.headingRef} tabIndex={-1} className={styles.sectionLabel}>
        {tm('inviteSection')}
      </h3>
      {full ? <p className={styles.notice}>{tm('full', { max: data.maxMembers })}</p> : null}
      {body}
    </section>
  );
}

function InviteLinkField({
  link,
  target,
  onDisable,
  disabling,
  tm,
}: Readonly<{
  link: MembersInviteLink;
  target: MembersInviteTarget;
  onDisable: () => void;
  disabling: boolean;
  tm: MembersTranslate;
}>) {
  const { locale } = useTranslation();
  const url = target.url(link.token);
  const { copied, copyLink, nativeShare, canNativeShare } = useShareAction(
    url,
    target.shareTitle,
    undefined,
    target.surface
  );
  return (
    <>
      <div className={styles.linkField}>
        <input
          className={styles.linkInput}
          readOnly
          value={url}
          aria-label={tm('linkLabel')}
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button size="sm" variant="primary" onClick={() => void copyLink()}>
          {copied ? (
            <Check size={ICON_SIZE.sm} aria-hidden />
          ) : (
            <Copy size={ICON_SIZE.sm} aria-hidden />
          )}
          {copied ? tm('copied') : tm('copy')}
        </Button>
      </div>
      {canNativeShare ? (
        <Button fullWidth onClick={() => void nativeShare()}>
          <Share2 size={ICON_SIZE.md} aria-hidden />
          {tm('share')}
        </Button>
      ) : null}
      <p className={styles.hint}>
        {tm('linkValidUntil', { date: formatValidUntil(link.expiresAt, locale) })}{' '}
        <LinkButton size="sm" disabled={disabling} onClick={onDisable}>
          {tm('disableLink')}
        </LinkButton>
      </p>
      <span className="visually-hidden" role="status" aria-live="polite">
        {copied ? tm('copied') : ''}
      </span>
    </>
  );
}

function LinkSection({
  link,
  target,
  actions,
  tm,
}: Readonly<{
  link: MembersInviteLink | null;
  target: MembersInviteTarget;
  actions: MembersActions;
  tm: MembersTranslate;
}>) {
  const [error, setError] = useState<string | null>(null);
  const { createLink, disableLink } = actions;
  const onError = (err: unknown) => setError(getErrorMessage(err, tm('linkError')));

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionLabel}>{tm('linkSection')}</h3>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {linkIsActive(link) ? (
        <InviteLinkField
          link={link}
          target={target}
          disabling={disableLink.isPending}
          onDisable={() => {
            setError(null);
            disableLink.mutate(undefined, { onError });
          }}
          tm={tm}
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
            {tm('createLink')}
          </Button>
          <p className={styles.hint}>{tm('createLinkHint')}</p>
        </>
      )}
    </section>
  );
}

type MembersBodyProps = Readonly<{
  roster: UseQueryResult<MembersRoster, Error>;
  invitable: UseQueryResult<readonly MembersPerson[], Error>;
  actions: MembersActions;
  inviteTarget: MembersInviteTarget;
  isOwner: boolean;
  tm: MembersTranslate;
}>;

function MembersBody({ roster, invitable, actions, inviteTarget, isOwner, tm }: MembersBodyProps) {
  const { user } = useAuth();

  if (roster.isPending) {
    return (
      <output className={styles.status}>
        <Spinner />
        <span className="visually-hidden">{tm('loading')}</span>
      </output>
    );
  }
  if (roster.isError) {
    return (
      <InlineError
        message={tm('loadError')}
        retryLabel={tm('retry')}
        onRetry={() => void roster.refetch()}
      />
    );
  }
  return (
    <>
      <MembersSection
        data={roster.data}
        isOwner={isOwner}
        viewerId={user?.userId}
        actions={actions}
        tm={tm}
      />
      {isOwner ? (
        <>
          <InviteSection data={roster.data} invitable={invitable} actions={actions} tm={tm} />
          <LinkSection
            link={roster.data.inviteLink}
            target={inviteTarget}
            actions={actions}
            tm={tm}
          />
        </>
      ) : null}
    </>
  );
}

export default function MembersDialog({
  title,
  help,
  copy,
  onClose,
  ...body
}: Readonly<
  Omit<MembersBodyProps, 'tm'> & {
    title: string;
    help: string;
    copy: MembersCopy;
    onClose: () => void;
  }
>) {
  const tm = useMembersCopy(copy);

  return (
    <ResponsiveDialog
      open
      title={title}
      onClose={onClose}
      footer={
        <ModalActions>
          <Button variant="primary" onClick={onClose}>
            {tm('done')}
          </Button>
        </ModalActions>
      }
    >
      <p className={styles.help}>{help}</p>
      <MembersBody {...body} tm={tm} />
    </ResponsiveDialog>
  );
}
