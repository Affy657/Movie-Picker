using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FriendGroups;
using MoviePicker.Api.Application.UseCases.SearchUsers;

namespace MoviePicker.Api.Application.UseCases.FriendGroupMembers;

public sealed class ListFriendGroupInvitableUsersHandler : IListFriendGroupInvitableUsersHandler
{
    private readonly IFriendGroupRepository _groups;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly TimeProvider _clock;

    public ListFriendGroupInvitableUsersHandler(
        IFriendGroupRepository groups,
        IFollowRepository follows,
        IUserRepository users,
        TimeProvider clock)
    {
        _groups = groups;
        _follows = follows;
        _users = users;
        _clock = clock;
    }

    public async Task<FriendGroupInvitableUsersResponse> HandleAsync(
        string userId,
        string groupId,
        string? query,
        CancellationToken ct = default)
    {
        var group = await FriendGroupPolicy.RequireOwnerAsync(_groups, userId, groupId, ct);
        var followingIds = await _follows.GetFollowingIdsAsync(userId, ct: ct);
        var now = _clock.GetUtcNow();
        var outsiders = followingIds
            .Where(id => group.RoleOf(id) is null && !group.IsInvited(id, now))
            .ToList();
        if (outsiders.Count == 0)
            return new FriendGroupInvitableUsersResponse();

        var search = UserSearchPolicy.Normalize(query);
        var matching = (await _users.ListCardsByIdsAsync(outsiders, ct))
            .DistinctBy(card => card.Id, StringComparer.Ordinal)
            .Where(card => search.Length == 0
                || UserSearchPolicy.Contains(card.DisplayName, search)
                || UserSearchPolicy.Contains(card.Handle, search))
            .ToDictionary(card => card.Id, StringComparer.Ordinal);

        return new FriendGroupInvitableUsersResponse
        {
            Users =
            [
                .. outsiders
                    .Where(matching.ContainsKey)
                    .Select(id => FriendGroupInvitableUserResponse.From(DisplayedPerson.From(matching[id])))
            ]
        };
    }
}
