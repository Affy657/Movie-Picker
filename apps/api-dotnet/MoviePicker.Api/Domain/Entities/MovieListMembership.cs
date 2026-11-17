namespace MoviePicker.Api.Domain.Entities;

public enum MovieListRole
{
    Owner,
    Member
}

public sealed record MovieListMember(string UserId, DateTimeOffset JoinedAt);

public sealed record MovieListInvitation(string UserId, DateTimeOffset InvitedAt)
{
    public static readonly TimeSpan Lifetime = UserNotification.Lifetime;

    public static DateTimeOffset LatestLapsedAt(DateTimeOffset now) => now - Lifetime;

    public bool IsPending(DateTimeOffset now) => InvitedAt > LatestLapsedAt(now);
}

public sealed record MovieListInviteLink(string Token, DateTimeOffset ExpiresAt, bool Disabled)
{
    public bool IsActive(DateTimeOffset now) => !Disabled && ExpiresAt > now;
}
