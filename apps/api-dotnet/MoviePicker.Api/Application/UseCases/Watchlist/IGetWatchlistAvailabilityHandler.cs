using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public interface IGetWatchlistAvailabilityHandler
{
    Task<WatchlistAvailabilityResponse> HandleAsync(string userId, CancellationToken ct = default);
}
