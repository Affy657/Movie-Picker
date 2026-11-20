using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.FriendGroups;

public static class FriendGroupPolicy
{
    public static string NormalizeName(string? raw)
    {
        var trimmed = (raw ?? string.Empty).Trim();
        if (trimmed.Length == 0)
            throw Errors.FriendGroupNameRequired();
        if (trimmed.Length > FriendGroup.MaxNameLength)
            throw Errors.FriendGroupNameTooLong(FriendGroup.MaxNameLength);
        return trimmed;
    }

    public static async Task EnsureRoomForNewGroupAsync(IFriendGroupRepository groups, string ownerId, CancellationToken ct)
    {
        if (await groups.CountByOwnerAsync(ownerId, ct) >= FriendGroup.MaxPerOwner)
            throw Errors.FriendGroupLimitReached(FriendGroup.MaxPerOwner);
    }

    public static async Task<FriendGroup> RequireAsync(
        IFriendGroupRepository groups,
        string userId,
        string groupId,
        CancellationToken ct) =>
        await groups.GetAsync(userId, groupId, ct) ?? throw Errors.FriendGroupNotFound();

    public static async Task<FriendGroup> RequireOwnerAsync(
        IFriendGroupRepository groups,
        string userId,
        string groupId,
        CancellationToken ct)
    {
        var group = await RequireAsync(groups, userId, groupId, ct);
        return group.OwnerId == userId ? group : throw Errors.FriendGroupOwnerOnly();
    }
}
