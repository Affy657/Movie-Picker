using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Follow;

internal static class FollowListQuery
{
    public static async Task<FollowListResponse> BuildAsync(
        IUserRepository users,
        IFollowRepository follows,
        string handle,
        string? currentUserId,
        Func<string, CancellationToken, Task<IReadOnlyList<string>>> getTargetIds,
        CancellationToken ct)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await users.GetByHandleAsync(normalized, ct);
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var ids = await getTargetIds(user.Id, ct);
        if (ids.Count == 0)
            return new FollowListResponse { Items = [] };

        var listed = await users.ListByIdsAsync(ids, ct);

        HashSet<string>? followingSet = null;
        if (currentUserId is not null)
        {
            var myFollowingIds = await follows.GetFollowingIdsAsync(currentUserId, ct: ct);
            followingSet = [.. myFollowingIds];
        }

        var orderedItems = ids
            .Select(id => listed.FirstOrDefault(u => u.Id == id))
            .Where(u => u is not null)
            .Select(u => new FollowUserItem
            {
                Handle = u!.Handle,
                DisplayName = u.DisplayName,
                AvatarId = u.AvatarId,
                IsFollowedByMe = followingSet is null ? null : followingSet.Contains(u.Id)
            })
            .ToList();

        return new FollowListResponse { Items = orderedItems };
    }
}
