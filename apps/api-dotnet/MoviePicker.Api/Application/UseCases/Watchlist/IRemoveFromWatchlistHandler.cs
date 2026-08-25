using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public interface IRemoveFromWatchlistHandler
{
    Task HandleAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
}
