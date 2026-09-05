using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public sealed class GetWatchlistHandler : IGetWatchlistHandler
{
    private const int DefaultTake = 500;
    private const int MaxTake = 500;

    private readonly IWatchlistRepository _watchlist;

    public GetWatchlistHandler(IWatchlistRepository watchlist)
    {
        _watchlist = watchlist;
    }

    public async Task<WatchlistResponse> HandleAsync(
        string userId,
        int skip = 0,
        int? take = null,
        CancellationToken ct = default)
    {
        var effectiveSkip = Math.Max(0, skip);
        var effectiveTake = Math.Clamp(take ?? DefaultTake, 1, MaxTake);

        var items = await _watchlist.ListPageByUserIdAsync(userId, effectiveSkip, effectiveTake, ct);
        var total = await _watchlist.CountByUserIdAsync(userId, ct);

        return new WatchlistResponse
        {
            Items = items.Select(WatchlistItemResponse.FromDomain).ToList(),
            Total = total,
            HasMore = effectiveSkip + items.Count < total
        };
    }
}
