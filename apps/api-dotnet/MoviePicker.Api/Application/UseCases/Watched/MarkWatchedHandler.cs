using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UserMovies;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Watched;

public sealed class MarkWatchedHandler : IMarkWatchedHandler
{
    private readonly IWatchedTitleRepository _watched;
    private readonly IWatchlistRepository _watchlist;
    private readonly MovieListItemFactory _facts;
    private readonly WatchedHistoryReader _history;
    private readonly TimeProvider _clock;

    public MarkWatchedHandler(
        IWatchedTitleRepository watched,
        IWatchlistRepository watchlist,
        MovieListItemFactory facts,
        WatchedHistoryReader history,
        TimeProvider clock)
    {
        _watched = watched;
        _watchlist = watchlist;
        _facts = facts;
        _history = history;
        _clock = clock;
    }

    public async Task<WatchedStatusResponse> HandleAsync(
        string userId,
        MarkWatchedRequest request,
        CancellationToken ct = default)
    {
        var rating = WatchedRating.Require(request.Rating);
        var existing = await _watched.GetAsync(userId, request.TmdbId, request.MediaType, ct);
        if (existing is null)
            await _watched.AddIfAbsentAsync(await NewEntryAsync(userId, request, rating, ct), ct);
        else if (rating is not null && rating != existing.Rating)
            await _watched.SetRatingAsync(userId, request.TmdbId, request.MediaType, rating, _clock.StorageNow(), ct);

        await _watchlist.RemoveAsync(userId, request.TmdbId, request.MediaType, ct);
        return await _history.ReadStatusAsync(userId, request.TmdbId, request.MediaType, ct);
    }

    private async Task<WatchedTitle> NewEntryAsync(
        string userId,
        MarkWatchedRequest request,
        int? rating,
        CancellationToken ct)
    {
        var now = _clock.StorageNow();
        var facts = await _facts.CreateAsync(request, now, ct);
        return WatchedTitle.Of(userId, facts, WatchedOrigin.Manual, rating, watchedAt: now, now);
    }
}
