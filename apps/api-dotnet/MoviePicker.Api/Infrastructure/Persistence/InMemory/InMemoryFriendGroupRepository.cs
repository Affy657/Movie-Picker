using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.InMemory;

public sealed class InMemoryFriendGroupRepository : IFriendGroupRepository
{
    private readonly Dictionary<string, FriendGroup> _groups = new(StringComparer.Ordinal);
    private readonly Lock _gate = new();

    public Task<IReadOnlyList<FriendGroup>> ListAdmittingAsync(string userId, CancellationToken ct = default) =>
        Where(group => group.RoleOf(userId) is not null);

    public Task<IReadOnlyList<FriendGroup>> ListByOwnerAsync(string ownerId, CancellationToken ct = default) =>
        Where(group => group.OwnerId == ownerId);

    public Task<IReadOnlyList<FriendGroup>> ListJoinedAsync(string userId, CancellationToken ct = default) =>
        Where(group => group.RoleOf(userId) == FriendGroupRole.Member);

    public Task<IReadOnlyList<FriendGroup>> ListInvitingAsync(string userId, CancellationToken ct = default) =>
        Where(group => group.HoldsInvitationOf(userId));

    public Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset now,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            IReadOnlySet<string> pending = groupIds
                .Where(id => _groups.TryGetValue(id, out var group) && group.IsInvited(userId, now))
                .ToHashSet(StringComparer.Ordinal);
            return Task.FromResult(pending);
        }
    }

    public Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_groups.Values.LongCount(group => group.OwnerId == ownerId));
    }

    public Task<FriendGroup?> GetAsync(string userId, string groupId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_groups.GetValueOrDefault(groupId) is { } group && group.RoleOf(userId) is not null ? group : null);
    }

    public Task<FriendGroup?> FindAsync(string groupId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_groups.GetValueOrDefault(groupId));
    }

    public Task<FriendGroup?> FindByInviteTokenAsync(string token, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(HolderOf(token));
    }

    public Task<FriendGroup> AddAsync(FriendGroup group, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var stored = group with { Id = Guid.NewGuid().ToString("N") };
            _groups[stored.Id] = stored;
            return Task.FromResult(stored);
        }
    }

    public Task<FriendGroup?> RenameAsync(
        string ownerId,
        string groupId,
        string name,
        DateTimeOffset updatedAt,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (!_groups.TryGetValue(groupId, out var group) || group.OwnerId != ownerId)
                return Task.FromResult<FriendGroup?>(null);

            var renamed = group with { Name = name, UpdatedAt = updatedAt };
            _groups[groupId] = renamed;
            return Task.FromResult<FriendGroup?>(renamed);
        }
    }

    public Task<bool> DeleteAsync(string ownerId, string groupId, CancellationToken ct = default)
    {
        lock (_gate)
            return Task.FromResult(_groups.TryGetValue(groupId, out var group) && group.OwnerId == ownerId && _groups.Remove(groupId));
    }

    public Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var owned = _groups.Values.Where(group => group.OwnerId == ownerId).Select(group => group.Id).ToList();
            owned.ForEach(id => _groups.Remove(id));
            return Task.FromResult((long)owned.Count);
        }
    }

    public Task<bool> AddInvitationAsync(
        string groupId,
        FriendGroupInvitation invitation,
        int maxSeats,
        CancellationToken ct = default) =>
        Update(
            groupId,
            group => group.RoleOf(invitation.UserId) is null
                && !group.IsInvited(invitation.UserId, invitation.InvitedAt)
                && group.SeatsTaken(invitation.InvitedAt) < maxSeats,
            group => Invited(group, invitation));

    public Task<bool> RemoveInvitationAsync(string groupId, string userId, CancellationToken ct = default) =>
        Update(groupId, group => group.HoldsInvitationOf(userId), group => Uninvited(group, userId));

    public Task<bool> AcceptInvitationAsync(string groupId, FriendGroupMember member, CancellationToken ct = default) =>
        Update(groupId, group => group.IsInvited(member.UserId, member.JoinedAt), group => Admitted(group, member));

    public Task<bool> JoinByInviteTokenAsync(
        string token,
        FriendGroupMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (HolderOf(token) is not { } group
                || !group.AcceptsInviteToken(token, now)
                || group.RoleOf(member.UserId) is not null
                || (!group.IsInvited(member.UserId, now) && group.SeatsTaken(now) >= maxSeats))
                return Task.FromResult(false);

            _groups[group.Id] = Admitted(group, member);
            return Task.FromResult(true);
        }
    }

    public Task<bool> RemoveMemberAsync(string groupId, string userId, bool disableInviteLink, CancellationToken ct = default) =>
        Update(
            groupId,
            group => group.RoleOf(userId) == FriendGroupRole.Member,
            group => Dismissed(group, userId) with
            {
                InviteLink = disableInviteLink && group.InviteLink is { } link ? link with { Disabled = true } : group.InviteLink
            });

    public Task<bool> SetInviteLinkAsync(
        string ownerId,
        string groupId,
        FriendGroupInviteLink link,
        CancellationToken ct = default) =>
        Update(groupId, group => group.OwnerId == ownerId, group => group with { InviteLink = link });

    public Task<bool> DisableInviteLinkAsync(string ownerId, string groupId, CancellationToken ct = default) =>
        Update(
            groupId,
            group => group.OwnerId == ownerId && group.InviteLink is not null,
            group => group with { InviteLink = group.InviteLink! with { Disabled = true } });

    public Task<long> RemoveFromOthersGroupsAsync(string userId, CancellationToken ct = default)
    {
        lock (_gate)
        {
            var holding = _groups.Values
                .Where(group => group.RoleOf(userId) == FriendGroupRole.Member || group.HoldsInvitationOf(userId))
                .ToList();
            foreach (var group in holding)
                _groups[group.Id] = Dismissed(Uninvited(group, userId), userId);
            return Task.FromResult((long)holding.Count);
        }
    }

    private Task<IReadOnlyList<FriendGroup>> Where(Func<FriendGroup, bool> predicate)
    {
        lock (_gate)
        {
            IReadOnlyList<FriendGroup> groups = [.. _groups.Values.Where(predicate).OrderByDescending(group => group.UpdatedAt)];
            return Task.FromResult(groups);
        }
    }

    private Task<bool> Update(string groupId, Func<FriendGroup, bool> allowed, Func<FriendGroup, FriendGroup> change)
    {
        lock (_gate)
        {
            if (!_groups.TryGetValue(groupId, out var group) || !allowed(group))
                return Task.FromResult(false);

            _groups[groupId] = change(group);
            return Task.FromResult(true);
        }
    }

    private FriendGroup? HolderOf(string token) =>
        _groups.Values.FirstOrDefault(group => group.InviteLink is { } link && string.Equals(link.Token, token, StringComparison.Ordinal));

    private static FriendGroup Uninvited(FriendGroup group, string userId) =>
        group with { Invitations = [.. group.Invitations.Where(invitation => invitation.UserId != userId)] };

    private static FriendGroup Invited(FriendGroup group, FriendGroupInvitation invitation)
    {
        var others = Uninvited(group, invitation.UserId);
        return others with { Invitations = [.. others.Invitations, invitation] };
    }

    private static FriendGroup Admitted(FriendGroup group, FriendGroupMember member) =>
        Uninvited(group, member.UserId) with { Members = [.. group.Members, member] };

    private static FriendGroup Dismissed(FriendGroup group, string userId) =>
        group with { Members = [.. group.Members.Where(member => member.UserId != userId)] };
}
