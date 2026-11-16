using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watched;

public interface IMarkWatchedHandler
{
    Task<WatchedStatusResponse> HandleAsync(string userId, MarkWatchedRequest request, CancellationToken ct = default);
}

public interface IGetWatchedStatusHandler
{
    Task<WatchedStatusResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default);
}

public interface ISetWatchedRatingHandler
{
    Task<WatchedStatusResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        CancellationToken ct = default);
}

public interface IUnmarkWatchedHandler
{
    Task HandleAsync(string userId, int tmdbId, MovieMediaType mediaType, CancellationToken ct = default);
}
