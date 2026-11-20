using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public static class FriendGroupInviteLinks
{
    public static async Task<FriendGroup?> FindAsync(IFriendGroupRepository groups, string token, CancellationToken ct) =>
        string.IsNullOrWhiteSpace(token) || token.Length > FriendGroupInviteToken.MaxLength
            ? null
            : await groups.FindByInviteTokenAsync(token, ct);

    public static async Task<FriendGroup?> FindActiveAsync(
        IFriendGroupRepository groups,
        string token,
        DateTimeOffset now,
        CancellationToken ct) =>
        await FindAsync(groups, token, ct) is { } group && group.AcceptsInviteToken(token, now) ? group : null;
}
