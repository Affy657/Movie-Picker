using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Profile;

public sealed class GetUserWatchlistHandler : IGetUserWatchlistHandler
{
    private readonly IUserRepository _users;
    private readonly IGetWatchlistHandler _watchlist;

    public GetUserWatchlistHandler(IUserRepository users, IGetWatchlistHandler watchlist)
    {
        _users = users;
        _watchlist = watchlist;
    }

    public async Task<WatchlistResponse> HandleAsync(
        string handle,
        string? currentUserId,
        int skip,
        int? take,
        CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        if (!PublicProfileGuard.CanSeeWatchlist(user, currentUserId))
            throw new NotFoundException("Watchlist introuvable");

        return await _watchlist.HandleAsync(user.Id, skip, take, ct);
    }
}
