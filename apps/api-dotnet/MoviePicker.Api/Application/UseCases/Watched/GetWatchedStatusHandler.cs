using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watched;

public sealed class GetWatchedStatusHandler : IGetWatchedStatusHandler
{
    private readonly WatchedHistoryReader _history;

    public GetWatchedStatusHandler(WatchedHistoryReader history)
    {
        _history = history;
    }

    public Task<WatchedStatusResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default) =>
        _history.ReadStatusAsync(userId, tmdbId, mediaType, ct);
}
