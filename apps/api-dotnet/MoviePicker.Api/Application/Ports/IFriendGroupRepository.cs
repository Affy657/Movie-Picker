using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IFriendGroupRepository
{
    Task<IReadOnlyList<FriendGroup>> ListAdmittingAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlyList<FriendGroup>> ListByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<IReadOnlyList<FriendGroup>> ListJoinedAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlyList<FriendGroup>> ListInvitingAsync(string userId, CancellationToken ct = default);

    Task<IReadOnlySet<string>> ListPendingInvitationIdsAsync(
        string userId,
        IReadOnlyCollection<string> groupIds,
        DateTimeOffset now,
        CancellationToken ct = default);

    Task<long> CountByOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<FriendGroup?> GetAsync(string userId, string groupId, CancellationToken ct = default);

    Task<FriendGroup?> FindAsync(string groupId, CancellationToken ct = default);

    Task<FriendGroup?> FindByInviteTokenAsync(string token, CancellationToken ct = default);

    Task<FriendGroup> AddAsync(FriendGroup group, CancellationToken ct = default);

    Task<FriendGroup?> RenameAsync(
        string ownerId,
        string groupId,
        string name,
        DateTimeOffset updatedAt,
        CancellationToken ct = default);

    Task<bool> DeleteAsync(string ownerId, string groupId, CancellationToken ct = default);

    Task<long> DeleteAllForOwnerAsync(string ownerId, CancellationToken ct = default);

    Task<bool> AddInvitationAsync(
        string groupId,
        FriendGroupInvitation invitation,
        int maxSeats,
        CancellationToken ct = default);

    Task<bool> RemoveInvitationAsync(string groupId, string userId, CancellationToken ct = default);

    Task<bool> AcceptInvitationAsync(string groupId, FriendGroupMember member, CancellationToken ct = default);

    Task<bool> JoinByInviteTokenAsync(
        string token,
        FriendGroupMember member,
        DateTimeOffset now,
        int maxSeats,
        CancellationToken ct = default);

    Task<bool> RemoveMemberAsync(string groupId, string userId, bool disableInviteLink, CancellationToken ct = default);

    Task<bool> SetInviteLinkAsync(
        string ownerId,
        string groupId,
        FriendGroupInviteLink link,
        CancellationToken ct = default);

    Task<bool> DisableInviteLinkAsync(string ownerId, string groupId, CancellationToken ct = default);

    Task<long> RemoveFromOthersGroupsAsync(string userId, CancellationToken ct = default);
}
