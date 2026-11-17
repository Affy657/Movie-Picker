using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.SearchUsers;

namespace MoviePicker.Api.Application.UseCases.MovieListMembers;

public sealed class ListMovieListInvitableUsersHandler : IListMovieListInvitableUsersHandler
{
    private readonly IMovieListRepository _lists;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public ListMovieListInvitableUsersHandler(
        IMovieListRepository lists,
        IFollowRepository follows,
        IUserRepository users,
        TimeProvider clock)
    {
        _lists = lists;
        _follows = follows;
        _users = users;
        _clock = clock;
    }

    public async Task<MovieListInvitableUsersResponse> HandleAsync(
        string userId,
        string listId,
        string? query,
        CancellationToken ct = default)
    {
        var list = await MovieListPolicy.RequireOwnerAsync(_lists, userId, listId, ct);
        var followingIds = await _follows.GetFollowingIdsAsync(userId, ct: ct);
        var now = _clock.GetUtcNow();
        var candidates = followingIds
            .Where(id => list.RoleOf(id) is null && !list.IsInvited(id, now))
            .ToList();
        if (candidates.Count == 0)
            return new MovieListInvitableUsersResponse();

        var cards = (await _users.ListCardsByIdsAsync(candidates, ct))
            .DistinctBy(card => card.Id, StringComparer.Ordinal)
            .ToDictionary(card => card.Id, StringComparer.Ordinal);
        var search = UserSearchPolicy.Normalize(query);

        return new MovieListInvitableUsersResponse
        {
            Users =
            [
                .. candidates
                    .Select(cards.GetValueOrDefault)
                    .OfType<UserCard>()
                    .Where(card => search.Length == 0
                        || UserSearchPolicy.Contains(card.DisplayName, search)
                        || UserSearchPolicy.Contains(card.Handle, search))
                    .Select(card => new MovieListInvitableUserResponse
                    {
                        UserId = card.Id,
                        Handle = card.Handle ?? string.Empty,
                        DisplayName = card.DisplayName,
                        AvatarId = card.AvatarId
                    })
            ]
        };
    }
}
