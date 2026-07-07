using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Follow;

public sealed class GetFollowersListHandler : IGetFollowersListHandler
{
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;

    public GetFollowersListHandler(IFollowRepository follows, IUserRepository users)
    {
        _follows = follows;
        _users = users;
    }

    public async Task<FollowListResponse> HandleAsync(
        string handle, string? currentUserId, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await _users.GetByHandleAsync(normalized, ct);
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var ids = await _follows.GetFollowerIdsAsync(user.Id, ct: ct);
        if (ids.Count == 0)
            return new FollowListResponse { Items = [] };

        var users = await _users.ListByIdsAsync(ids, ct);

        HashSet<string>? followingSet = null;
        if (currentUserId is not null)
        {
            var myFollowingIds = await _follows.GetFollowingIdsAsync(currentUserId, ct: ct);
            followingSet = [.. myFollowingIds];
        }

        var orderedItems = ids
            .Select(id => users.FirstOrDefault(u => u.Id == id))
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
