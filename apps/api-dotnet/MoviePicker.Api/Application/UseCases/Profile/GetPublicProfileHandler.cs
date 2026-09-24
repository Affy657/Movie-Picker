using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

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

        var countsTask = _follows.GetCountsAsync(user.Id, ct);
        var followedByMeTask = IsFollowedByMeAsync(user, currentUserId, ct);
        var watchlistCountTask = WatchlistCountAsync(user, currentUserId, ct);
        await Task.WhenAll(countsTask, followedByMeTask, watchlistCountTask);
        var (followingCount, followersCount) = await countsTask;

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
            IsFollowedByMe = await followedByMeTask,
            IsWatchlistPublic = user.IsWatchlistPublic,
            WatchlistCount = await watchlistCountTask,
            Favorites = FavoriteTitleResponse.ListFrom(user.Favorites)
        };
    }

    private async Task<bool?> IsFollowedByMeAsync(User user, string? currentUserId, CancellationToken ct)
    {
        if (currentUserId is null || currentUserId == user.Id)
            return null;
        return await _follows.IsFollowingAsync(currentUserId, user.Id, ct);
    }

    private async Task<int?> WatchlistCountAsync(User user, string? currentUserId, CancellationToken ct)
    {
        if (!PublicProfileGuard.CanSeeWatchlist(user, currentUserId))
            return null;
        return (int)await _watchlist.CountByUserIdAsync(user.Id, ct);
    }
}
