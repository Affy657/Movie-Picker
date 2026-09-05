using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public interface IGetWatchlistHandler
{
    Task<WatchlistResponse> HandleAsync(
        string userId,
        int skip = 0,
        int? take = null,
        CancellationToken ct = default);
}
