namespace MoviePicker.Api.Domain.Entities;

public enum MovieListRole
{
    Owner,
    Member
}

public sealed record MovieListMember(string UserId, DateTimeOffset JoinedAt);

public sealed record MovieListInvitation(string UserId, DateTimeOffset InvitedAt);

public sealed record MovieListInviteLink(string Token, DateTimeOffset ExpiresAt, bool Disabled)
{
    public bool IsActive(DateTimeOffset now) => !Disabled && ExpiresAt > now;
}
