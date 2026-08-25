using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public sealed class RemoveFromWatchlistHandler : IRemoveFromWatchlistHandler
{
    private readonly IWatchlistRepository _watchlist;

    public RemoveFromWatchlistHandler(IWatchlistRepository watchlist)
    {
        _watchlist = watchlist;
    }

    public async Task HandleAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        await _watchlist.RemoveAsync(userId, tmdbId, mediaType, ct);
    }
}
