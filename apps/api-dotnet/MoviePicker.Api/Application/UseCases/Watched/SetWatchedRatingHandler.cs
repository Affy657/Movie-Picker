using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Watched;

public sealed class SetWatchedRatingHandler : ISetWatchedRatingHandler
{
    private readonly IWatchedTitleRepository _watched;
    private readonly WatchedHistoryReader _history;
    private readonly TimeProvider _clock;

    public SetWatchedRatingHandler(IWatchedTitleRepository watched, WatchedHistoryReader history, TimeProvider clock)
    {
        _watched = watched;
        _history = history;
        _clock = clock;
    }

    public async Task<WatchedStatusResponse> HandleAsync(
        string userId,
        int tmdbId,
        MovieMediaType mediaType,
        int? rating,
        CancellationToken ct = default)
    {
        var accepted = WatchedRating.Require(rating);
        if (await _watched.SetRatingAsync(userId, tmdbId, mediaType, accepted, _clock.StorageNow(), ct) is null)
            throw Errors.WatchedTitleNotFound();

        return await _history.ReadStatusAsync(userId, tmdbId, mediaType, ct);
    }
}
