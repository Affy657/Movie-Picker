using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdWatchedWrite(bool Added, bool RemovedFromWatchlist);

public sealed class LetterboxdWatchedWriter
{
    private static readonly TimeOnly DiaryTimeOfDay = new(12, 0);

    private readonly IWatchedTitleRepository _watched;
    private readonly IWatchlistRepository _watchlist;
    private readonly MovieListItemFactory _facts;
    private readonly TimeProvider _clock;

    public LetterboxdWatchedWriter(
        IWatchedTitleRepository watched,
        IWatchlistRepository watchlist,
        MovieListItemFactory facts,
        TimeProvider clock)
    {
        _watched = watched;
        _watchlist = watchlist;
        _facts = facts;
        _clock = clock;
    }

    public async Task<LetterboxdWatchedWrite> WriteAsync(
        string userId,
        LetterboxdWatchedSelectionRequest selection,
        bool keepOnWatchlist,
        CancellationToken ct = default) =>
        await WriteOverAsync(
            userId,
            selection,
            keepOnWatchlist,
            await _watched.GetAsync(userId, selection.TmdbId, selection.MediaType, ct),
            ct);

    public async Task<LetterboxdWatchedWrite> WriteAsync(
        string userId,
        LetterboxdWatchedSelectionRequest selection,
        bool keepOnWatchlist,
        KnownWatchedEntries known,
        CancellationToken ct)
    {
        var existing = known.Holds(selection.TmdbId, selection.MediaType)
            ? known.Unchanged(selection.TmdbId, selection.MediaType)
                ?? await _watched.GetAsync(userId, selection.TmdbId, selection.MediaType, ct)
            : null;
        var write = await WriteOverAsync(userId, selection, keepOnWatchlist, existing, ct);
        known.MarkChanged(selection.TmdbId, selection.MediaType);
        return write;
    }

    private async Task<LetterboxdWatchedWrite> WriteOverAsync(
        string userId,
        LetterboxdWatchedSelectionRequest selection,
        bool keepOnWatchlist,
        WatchedTitle? existing,
        CancellationToken ct)
    {
        var slug = string.IsNullOrWhiteSpace(selection.LetterboxdSlug) ? null : selection.LetterboxdSlug.Trim();
        if (existing is not null)
        {
            await LinkAsync(existing, slug, selection.Rating, ct);
            return new LetterboxdWatchedWrite(false, false);
        }

        var now = _clock.StorageNow();
        var facts = await _facts.CreateAsync(selection, now, ct);
        var entry = WatchedTitle.Of(
            userId,
            facts,
            WatchedOrigin.Letterboxd,
            selection.Rating,
            WatchedAt(selection.WatchedOn, now),
            now);
        await _watched.AddIfAbsentAsync(entry with { LetterboxdSlug = slug }, ct);

        var removedFromWatchlist = !keepOnWatchlist
            && await _watchlist.RemoveAsync(userId, selection.TmdbId, selection.MediaType, ct);
        return new LetterboxdWatchedWrite(true, removedFromWatchlist);
    }

    public async Task FollowRatingAsync(WatchedTitle entry, int? rating, CancellationToken ct = default)
    {
        if (entry.LetterboxdMayRate && entry.Rating != rating)
            await _watched.ApplyLetterboxdRatingAsync(entry.OwnerId, entry.TmdbId, entry.MediaType, rating, _clock.StorageNow(), ct);
    }

    private async Task LinkAsync(WatchedTitle existing, string? slug, int? rating, CancellationToken ct)
    {
        if (slug is not null && !string.Equals(existing.LetterboxdSlug, slug, StringComparison.OrdinalIgnoreCase))
            await _watched.LinkLetterboxdAsync(existing.OwnerId, existing.TmdbId, existing.MediaType, slug, ct);
        await FollowRatingAsync(existing, rating, ct);
    }

    private static DateTimeOffset WatchedAt(DateOnly? watchedOn, DateTimeOffset now)
    {
        if (watchedOn is not { } day)
            return now;
        var diaryDay = new DateTimeOffset(day.ToDateTime(DiaryTimeOfDay), TimeSpan.Zero);
        return diaryDay < now ? diaryDay : now;
    }
}
