using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

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

    public Task<FollowListResponse> HandleAsync(
        string handle, string? currentUserId, CancellationToken ct = default) =>
        FollowListQuery.BuildAsync(
            _users, _follows, handle, currentUserId,
            (id, c) => _follows.GetFollowerIdsAsync(id, ct: c), ct);
}
