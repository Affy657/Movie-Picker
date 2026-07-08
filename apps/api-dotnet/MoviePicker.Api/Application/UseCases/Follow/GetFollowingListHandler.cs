using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Follow;

public sealed class GetFollowingListHandler : IGetFollowingListHandler
{
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;

    public GetFollowingListHandler(IFollowRepository follows, IUserRepository users)
    {
        _follows = follows;
        _users = users;
    }

    public Task<FollowListResponse> HandleAsync(
        string handle, string? currentUserId, CancellationToken ct = default) =>
        FollowListQuery.BuildAsync(
            _users, _follows, handle, currentUserId,
            (id, c) => _follows.GetFollowingIdsAsync(id, ct: c), ct);
}
