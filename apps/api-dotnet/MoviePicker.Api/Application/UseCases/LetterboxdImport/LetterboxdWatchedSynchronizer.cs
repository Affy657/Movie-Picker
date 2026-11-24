using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdWatchedOutcome(
    int Added,
    int Removed,
    int RemovedFromWatchlist,
    IReadOnlyList<string> UnmatchedTitles,
    IReadOnlyList<LetterboxdImportRowResponse> PendingChoices,
    int TotalOnLetterboxd,
    int TotalTruncated)
{
    public static readonly LetterboxdWatchedOutcome None = new(0, 0, 0, [], [], 0, 0);
}

public sealed class LetterboxdWatchedSynchronizer
{
    private const int FirstRowIndex = LetterboxdImportLimits.MaxRows;

    private readonly IWatchedTitleRepository _watched;
    private readonly LetterboxdTitleResolver _resolver;
    private readonly LetterboxdWatchedWriter _writer;
    private readonly ILogger<LetterboxdWatchedSynchronizer> _logger;

    public LetterboxdWatchedSynchronizer(
        IWatchedTitleRepository watched,
        ITmdbMovieSearch tmdb,
        LetterboxdWatchedWriter writer,
        ILogger<LetterboxdWatchedSynchronizer> logger)
    {
        _watched = watched;
        _resolver = new LetterboxdTitleResolver(tmdb);
        _writer = writer;
        _logger = logger;
    }

    public async Task<LetterboxdWatchedOutcome> ApplyAsync(
        string userId,
        LetterboxdFilmsSnapshot snapshot,
        IReadOnlySet<string>? letterboxdWatchlistSlugs,
        IReadOnlySet<string>? slugsOfferedAsChoices = null,
        CancellationToken ct = default)
    {
        var entries = await _watched.ListByOwnerAsync(userId, ct);
        var known = new KnownWatchedEntries(entries);
        var bySlug = entries
            .Where(entry => !string.IsNullOrEmpty(entry.LetterboxdSlug))
            .GroupBy(entry => entry.LetterboxdSlug!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);

        foreach (var film in snapshot.Films.Where(film => bySlug.ContainsKey(film.Slug)))
        {
            var entry = bySlug[film.Slug];
            await _writer.FollowRatingAsync(entry, film.Rating, ct);
            known.MarkChanged(entry.TmdbId, entry.MediaType);
        }

        var unknown = snapshot.Films
            .Where(film => !bySlug.ContainsKey(film.Slug))
            .OrderBy(film => slugsOfferedAsChoices?.Contains(film.Slug) == true)
            .ToList();
        var addition = await AddUnknownAsync(userId, unknown, letterboxdWatchlistSlugs, known, ct);

        if (!snapshot.ConfirmsDepartures)
        {
            _logger.LogInformation(
                "Letterboxd watched films of {UserId} read up to {Read} of {Total} without a confirmed count: no watched title removed",
                userId,
                snapshot.Films.Count,
                snapshot.Total);
        }

        ct.ThrowIfCancellationRequested();
        var removed = snapshot.ConfirmsDepartures
            ? await RemoveDepartedAsync(userId, entries, snapshot, addition.Relinked, ct)
            : 0;

        return new LetterboxdWatchedOutcome(
            addition.Added,
            removed,
            addition.RemovedFromWatchlist,
            addition.UnmatchedTitles,
            addition.PendingChoices,
            snapshot.Total,
            LetterboxdTitleResolver.TotalTruncated(snapshot, unknown.Count));
    }

    private async Task<AdditionResult> AddUnknownAsync(
        string userId,
        IReadOnlyList<LetterboxdFilm> unknown,
        IReadOnlySet<string>? letterboxdWatchlistSlugs,
        KnownWatchedEntries known,
        CancellationToken ct)
    {
        var result = new AdditionResult();
        var rowIndex = FirstRowIndex;
        foreach (var film in unknown.Take(LetterboxdImportLimits.MaxRows))
        {
            ct.ThrowIfCancellationRequested();
            rowIndex++;
            var resolution = await _resolver.ResolveAsync(rowIndex, film, LetterboxdImportTarget.Watched, ct);
            if (resolution.Unmatched is { } unmatched)
                result.UnmatchedTitles.Add(unmatched);
            else if (resolution.Pending is { } pending)
                result.PendingChoices.Add(pending);
            else if (resolution.Confident is { } confident)
                await WriteAsync(userId, film, confident, letterboxdWatchlistSlugs, known, result, ct);
        }

        return result;
    }

    private async Task WriteAsync(
        string userId,
        LetterboxdFilm film,
        TmdbSearchItem confident,
        IReadOnlySet<string>? letterboxdWatchlistSlugs,
        KnownWatchedEntries known,
        AdditionResult result,
        CancellationToken ct)
    {
        var keepOnWatchlist = letterboxdWatchlistSlugs?.Contains(film.Slug) == true;
        var write = await _writer.WriteAsync(userId, ToSelection(film, confident), keepOnWatchlist, known, ct);
        if (write.Added)
            result.Added++;
        else
            result.Relinked.Add((confident.Id, confident.MediaType));
        if (write.RemovedFromWatchlist)
            result.RemovedFromWatchlist++;
    }

    private async Task<int> RemoveDepartedAsync(
        string userId,
        IReadOnlyList<WatchedTitle> entries,
        LetterboxdFilmsSnapshot snapshot,
        HashSet<(int TmdbId, MovieMediaType MediaType)> relinked,
        CancellationToken ct)
    {
        var onLetterboxd = snapshot.Films.Select(film => film.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var departedIds = entries
            .Where(entry => entry.Origin == WatchedOrigin.Letterboxd
                && entry.LetterboxdSlug is { Length: > 0 } slug
                && !onLetterboxd.Contains(slug)
                && !relinked.Contains((entry.TmdbId, entry.MediaType)))
            .Select(entry => entry.Id)
            .ToList();
        return departedIds.Count == 0 ? 0 : (int)await _watched.RemoveFromLetterboxdAsync(userId, departedIds, ct);
    }

    private static LetterboxdWatchedSelectionRequest ToSelection(LetterboxdFilm film, TmdbSearchItem item) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        GenreIds = item.GenreIds,
        LetterboxdSlug = film.Slug,
        Rating = film.Rating,
        WatchedOn = film.WatchedOn
    };

    private sealed class AdditionResult
    {
        public int Added { get; set; }
        public int RemovedFromWatchlist { get; set; }
        public List<string> UnmatchedTitles { get; } = [];
        public List<LetterboxdImportRowResponse> PendingChoices { get; } = [];
        public HashSet<(int TmdbId, MovieMediaType MediaType)> Relinked { get; } = [];
    }
}
