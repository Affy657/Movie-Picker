using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public sealed class GetWatchlistHandler : IGetWatchlistHandler
{
    private const int MaxItems = 500;

    private readonly IWatchlistRepository _watchlist;

    public GetWatchlistHandler(IWatchlistRepository watchlist)
    {
        _watchlist = watchlist;
    }

    public async Task<WatchlistResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var items = await _watchlist.ListByUserIdAsync(userId, MaxItems, ct);
        return new WatchlistResponse
        {
            Items = items.Select(WatchlistItemResponse.FromDomain).ToList()
        };
    }
}
