import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/hooks/queryKeys';
import { AppTestProviders, createTestQueryClient } from '@/test-utils/queryWrapper';
import { apiJson } from '@/mocks/apiJson';
import {
  authMeGuestHandler,
  createGroupJoinHandlers,
  createGroupMembershipHandlers,
  createGroupsHandlers,
  TEST_API_V1,
} from '@/mocks/handlers';
import { getStoredParticipant } from '@/shared/utils/eventIdentityStorage';
import { buildUserProfile } from '@/test-utils/userProfile';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import {
  useAnswerGroupInvitation,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useGroupMemberActions,
  useGroupMembers,
  useJoinGroupByLink,
  useJoinGroupNight,
  useLeaveGroup,
  useRenameGroup,
} from './useGroups';

const authedLea = http.get(`${TEST_API_V1}/auth/me`, () =>
  apiJson<'UserProfileResponse'>(buildUserProfile({ userId: 'u2', displayName: 'Léa Moreau' }))
);

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <AppTestProviders client={client}>{children}</AppTestProviders>
  );
}

function isStale(client: QueryClient, key: readonly unknown[]) {
  return client.getQueryState(key)?.isInvalidated === true;
}

function seed(client: QueryClient, ...keys: ReadonlyArray<readonly unknown[]>) {
  for (const key of keys) client.setQueryData(key, {});
}

describe('group hooks', () => {
  const server = setupServer(authMeGuestHandler);

  beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
  afterEach(() => {
    server.resetHandlers();
    sessionStorage.clear();
  });
  afterAll(() => server.close());

  it('reads a group with its members and nights', async () => {
    server.use(...createGroupsHandlers([{ id: 'g1', name: 'Les jeudis ciné' }]));
    const client = createTestQueryClient();

    const { result } = renderHook(() => useGroup('g1'), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(result.current.data?.name).toBe('Les jeudis ciné'));
    expect(result.current.data?.members).toHaveLength(1);
  });

  it('waits for an account before reading a group', () => {
    const client = createTestQueryClient();

    const { result } = renderHook(() => useGroup('g1', { enabled: false }), {
      wrapper: wrapperFor(client),
    });

    expect(result.current.fetchStatus).toBe('idle');
  });

  it('creates a group and refreshes My groups', async () => {
    server.use(...createGroupsHandlers());
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine);

    const { result } = renderHook(() => useCreateGroup(), { wrapper: wrapperFor(client) });
    let created: { id: string } | undefined;
    await act(async () => {
      created = await result.current.mutateAsync('Famille');
    });

    expect(created?.id).toBe('g1');
    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
  });

  it('renames a group and refreshes the group, My groups and the nights that show its name', async () => {
    server.use(...createGroupsHandlers([{ id: 'g1', name: 'Famille' }]));
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine, queryKeys.groups.detail('g1'), queryKeys.myEvents.active);

    const { result } = renderHook(() => useRenameGroup('g1'), { wrapper: wrapperFor(client) });
    await act(async () => {
      await result.current.mutateAsync('La famille');
    });

    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
    expect(isStale(client, queryKeys.groups.detail('g1'))).toBe(true);
    expect(isStale(client, queryKeys.myEvents.active)).toBe(true);
  });

  it.each([
    ['deleting', useDeleteGroup],
    ['leaving', useLeaveGroup],
  ])(
    'refreshes My groups and My nights after %s a group, without reading the group again',
    async (_label, useAction) => {
      server.use(...createGroupsHandlers([{ id: 'g1', name: 'Famille' }]));
      const client = createTestQueryClient();
      seed(
        client,
        queryKeys.groups.mine,
        queryKeys.groups.detail('g1'),
        queryKeys.groups.members('g1'),
        queryKeys.myEvents.active
      );

      const { result } = renderHook(() => useAction(), { wrapper: wrapperFor(client) });
      await act(async () => {
        await result.current.mutateAsync('g1');
      });

      expect(isStale(client, queryKeys.groups.mine)).toBe(true);
      expect(isStale(client, queryKeys.myEvents.active)).toBe(true);
      expect(isStale(client, queryKeys.groups.detail('g1'))).toBe(false);
      expect(isStale(client, queryKeys.groups.members('g1'))).toBe(false);
    }
  );

  it('joins a group from an invitation, whose nights then reach My nights', async () => {
    server.use(
      ...createGroupsHandlers(
        [],
        [{ groupId: 'g2', name: 'Ciné-club', invitedByDisplayName: 'Inès' }]
      )
    );
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine, queryKeys.myEvents.active);

    const { result } = renderHook(() => useAnswerGroupInvitation(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ groupId: 'g2', accept: true });
    });

    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
    expect(isStale(client, queryKeys.myEvents.active)).toBe(true);
  });

  it('declines an invitation and only refreshes My groups', async () => {
    server.use(
      ...createGroupsHandlers(
        [],
        [{ groupId: 'g2', name: 'Ciné-club', invitedByDisplayName: 'Inès' }]
      )
    );
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine, queryKeys.myEvents.active);

    const { result } = renderHook(() => useAnswerGroupInvitation(), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await result.current.mutateAsync({ groupId: 'g2', accept: false });
    });

    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
    expect(isStale(client, queryKeys.myEvents.active)).toBe(false);
  });

  it('reads the members with the creator marked, and refreshes the group once a member is removed', async () => {
    server.use(
      ...createGroupMembershipHandlers('g1', {
        members: [
          { userId: 'u1', handle: 'alice', displayName: 'Alice', avatarId: null, role: 'owner' },
          { userId: 'u3', handle: 'sam', displayName: 'Sam', avatarId: null },
        ],
      })
    );
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine, queryKeys.groups.detail('g1'));

    const members = renderHook(() => useGroupMembers('g1'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(members.result.current.data?.members).toHaveLength(2));
    expect(members.result.current.data?.members.map((member) => member.isOwner)).toEqual([
      true,
      false,
    ]);

    const actions = renderHook(() => useGroupMemberActions('g1'), {
      wrapper: wrapperFor(client),
    });
    await act(async () => {
      await actions.result.current.removeMember.mutateAsync('u3');
    });

    expect(isStale(client, queryKeys.groups.detail('g1'))).toBe(true);
    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
    await waitFor(() => expect(members.result.current.data?.members).toHaveLength(1));
  });

  it('joins a group by link and refreshes My groups and My nights', async () => {
    server.use(
      ...createGroupJoinHandlers(
        'tok',
        {
          name: 'Les jeudis ciné',
          ownerDisplayName: 'Léa Moreau',
          memberCount: 6,
          memberPreview: [],
          isFull: false,
          role: null,
          groupId: null,
        },
        { id: 'g1', name: 'Les jeudis ciné' }
      )
    );
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.mine, queryKeys.myEvents.active);

    const { result } = renderHook(() => useJoinGroupByLink(), { wrapper: wrapperFor(client) });
    let joined: { group: { id: string } } | undefined;
    await act(async () => {
      joined = await result.current.mutateAsync('tok');
    });

    expect(joined?.group.id).toBe('g1');
    expect(isStale(client, queryKeys.groups.mine)).toBe(true);
    expect(isStale(client, queryKeys.myEvents.active)).toBe(true);
  });

  it('joins a night of the group in one click under the account name, and refreshes the group', async () => {
    let pseudo: unknown;
    server.use(
      authedLea,
      http.post(`${TEST_API_V1}/events/jeudi/join`, async ({ request }) => {
        pseudo = ((await request.json()) as { pseudo: string }).pseudo;
        return apiJson<'JoinEventResult'>(
          {
            participant: {
              _id: 'p9',
              eventId: 'e1',
              pseudo: 'Léa Moreau',
              createdAt: '2026-11-01T00:00:00Z',
              updatedAt: '2026-11-01T00:00:00Z',
            },
            isNew: true,
            message: '',
          },
          { status: 201 }
        );
      })
    );
    const client = createTestQueryClient();
    seed(client, queryKeys.groups.detail('g1'), queryKeys.myEvents.active);

    const { result } = renderHook(() => ({ auth: useAuth(), join: useJoinGroupNight() }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.auth.user?.userId).toBe('u2'));
    await act(async () => {
      await result.current.join.mutateAsync('jeudi');
    });

    expect(pseudo).toBe('Léa Moreau');
    expect(getStoredParticipant('jeudi')).toEqual({ participantId: 'p9', pseudo: 'Léa Moreau' });
    expect(isStale(client, queryKeys.groups.detail('g1'))).toBe(true);
    expect(isStale(client, queryKeys.myEvents.active)).toBe(true);
  });
});
