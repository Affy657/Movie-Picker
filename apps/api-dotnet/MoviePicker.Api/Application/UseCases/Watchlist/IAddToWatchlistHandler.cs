using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public interface IAddToWatchlistHandler
{
    Task<WatchlistItemResponse> HandleAsync(string userId, AddWatchlistItemRequest request, CancellationToken ct = default);
}
