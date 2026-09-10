using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.SearchUsers;

public sealed class SearchUsersHandler : ISearchUsersHandler
{
    private readonly IUserRepository _users;
    private readonly IFollowRepository _follows;

    public SearchUsersHandler(IUserRepository users, IFollowRepository follows)
    {
        _users = users;
        _follows = follows;
    }

    public async Task<FollowListResponse> HandleAsync(
        string? query, string? currentUserId, CancellationToken ct = default)
    {
        var normalized = UserSearchPolicy.Normalize(query);
        if (normalized.Length < UserSearchPolicy.MinQueryLength)
            return new FollowListResponse { Items = [] };

        var found = await _users.SearchPublicAsync(normalized, UserSearchPolicy.ResultLimit, ct);
        if (found.Count == 0)
            return new FollowListResponse { Items = [] };

        HashSet<string>? followingSet = null;
        if (currentUserId is not null)
        {
            var myFollowingIds = await _follows.GetFollowingIdsAsync(currentUserId, ct: ct);
            followingSet = [.. myFollowingIds];
        }

        var items = found
            .OrderByDescending(user => MatchesFromStart(user, normalized))
            .ThenBy(user => user.DisplayName, StringComparer.CurrentCultureIgnoreCase)
            .Select(user => new FollowUserItem
            {
                Handle = user.Handle,
                DisplayName = user.DisplayName,
                AvatarId = user.AvatarId,
                IsFollowedByMe = followingSet is null ? null : followingSet.Contains(user.Id)
            })
            .ToList();

        return new FollowListResponse { Items = items };
    }

    private static bool MatchesFromStart(User user, string query) =>
        UserSearchPolicy.StartsWith(user.DisplayName, query)
        || UserSearchPolicy.StartsWith(user.Handle, query);
}
