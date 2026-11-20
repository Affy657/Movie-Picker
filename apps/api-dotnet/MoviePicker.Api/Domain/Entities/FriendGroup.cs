namespace MoviePicker.Api.Domain.Entities;

public sealed record FriendGroup
{
    public const int MaxPerOwner = 20;

    public const int MaxNameLength = 40;

    public const int MaxMembers = 20;

    public const int MemberPreviewCount = 4;

    public static readonly TimeSpan InviteLinkLifetime = TimeSpan.FromDays(7);

    public string Id { get; init; } = string.Empty;
    public string OwnerId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public IReadOnlyList<FriendGroupMember> Members { get; init; } = [];
    public IReadOnlyList<FriendGroupInvitation> Invitations { get; init; } = [];
    public FriendGroupInviteLink? InviteLink { get; init; }

    public int MemberCount => Members.Count + 1;

    public IEnumerable<FriendGroupInvitation> PendingInvitations(DateTimeOffset now) =>
        Invitations.Where(invitation => invitation.IsPending(now));

    public int SeatsTaken(DateTimeOffset now) => MemberCount + PendingInvitations(now).Count();

    public bool IsFull(DateTimeOffset now) => SeatsTaken(now) >= MaxMembers;

    public FriendGroupRole? RoleOf(string userId)
    {
        if (userId == OwnerId)
            return FriendGroupRole.Owner;
        return Members.Any(member => member.UserId == userId) ? FriendGroupRole.Member : null;
    }

    public bool KeepsNight(Event night) =>
        night.GroupId == Id && night.CreatorUserId is { Length: > 0 } hostId && RoleOf(hostId) is not null;

    public static IEnumerable<Event> NightsKeptBy(IEnumerable<Event> nights, IEnumerable<FriendGroup> groups)
    {
        var byId = groups.ToDictionary(group => group.Id, StringComparer.Ordinal);
        return nights.Where(night =>
            night.GroupId is { } groupId && byId.TryGetValue(groupId, out var group) && group.KeepsNight(night));
    }

    public bool IsInvited(string userId, DateTimeOffset now) =>
        PendingInvitations(now).Any(invitation => invitation.UserId == userId);

    public bool HoldsInvitationOf(string userId) => Invitations.Any(invitation => invitation.UserId == userId);

    public IReadOnlyList<string> PreviewMemberIds() =>
        [OwnerId, .. Members.Take(MemberPreviewCount - 1).Select(member => member.UserId)];

    public bool AcceptsInviteToken(string token, DateTimeOffset now) =>
        InviteLink is { } link && string.Equals(link.Token, token, StringComparison.Ordinal) && link.IsActive(now);
}
