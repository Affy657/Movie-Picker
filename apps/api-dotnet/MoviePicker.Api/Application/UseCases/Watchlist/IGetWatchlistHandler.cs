using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public interface IGetWatchlistHandler
{
    Task<WatchlistResponse> HandleAsync(string userId, CancellationToken ct = default);
}
