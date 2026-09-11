using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class GetPublicProfileHandler : IGetPublicProfileHandler
{
    private readonly IUserRepository _users;
    private readonly IFollowRepository _follows;
    private readonly IWatchlistRepository _watchlist;

    public GetPublicProfileHandler(IUserRepository users, IFollowRepository follows, IWatchlistRepository watchlist)
    {
        _users = users;
        _follows = follows;
        _watchlist = watchlist;
    }

    public async Task<PublicProfileResponse> HandleAsync(
        string handle, string? currentUserId = null, CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);

        var (followingCount, followersCount) = await _follows.GetCountsAsync(user.Id, ct);

        bool? isFollowedByMe = null;
        if (currentUserId is not null && currentUserId != user.Id)
            isFollowedByMe = await _follows.IsFollowingAsync(currentUserId, user.Id, ct);

        int? watchlistCount = null;
        if (PublicProfileGuard.CanSeeWatchlist(user, currentUserId))
            watchlistCount = (int)await _watchlist.CountByUserIdAsync(user.Id, ct);

        return new PublicProfileResponse
        {
            Handle = user.Handle,
            DisplayName = user.DisplayName,
            AvatarId = user.AvatarId,
            Bio = user.Bio,
            MemberSince = user.CreatedAt,
            FollowingCount = followingCount,
            FollowersCount = followersCount,
            IsSupporter = user.SupporterSince is not null,
            IsFollowedByMe = isFollowedByMe,
            IsWatchlistPublic = user.IsWatchlistPublic,
            WatchlistCount = watchlistCount
        };
    }
}
