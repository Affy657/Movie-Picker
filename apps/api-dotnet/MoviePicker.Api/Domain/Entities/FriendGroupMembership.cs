namespace MoviePicker.Api.Domain.Entities;

public enum FriendGroupRole
{
    Owner,
    Member
}

public sealed record FriendGroupMember(string UserId, DateTimeOffset JoinedAt);

public sealed record FriendGroupInvitation(string UserId, DateTimeOffset InvitedAt)
{
    public static readonly TimeSpan Lifetime = UserNotification.Lifetime;

    public static DateTimeOffset LatestLapsedAt(DateTimeOffset now) => now - Lifetime;

    public bool IsPending(DateTimeOffset now) => InvitedAt > LatestLapsedAt(now);
}

public sealed record FriendGroupInviteLink(string Token, DateTimeOffset ExpiresAt, bool Disabled)
{
    public bool IsActive(DateTimeOffset now) => !Disabled && ExpiresAt > now;
}
