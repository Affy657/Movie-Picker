using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdSyncOutcome(
    bool Succeeded,
    string? Error,
    int Added,
    int Removed,
    IReadOnlyList<string> UnmatchedTitles,
    IReadOnlyList<LetterboxdImportRowResponse> PendingChoices,
    int TotalOnLetterboxd,
    int TotalTruncated);

public sealed class LetterboxdWatchlistSynchronizer
{
    private readonly IWatchlistRepository _watchlist;
    private readonly ILetterboxdWatchlistClient _letterboxd;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IAddToWatchlistHandler _addToWatchlist;
    private readonly ILogger<LetterboxdWatchlistSynchronizer> _logger;

    public LetterboxdWatchlistSynchronizer(
        IWatchlistRepository watchlist,
        ILetterboxdWatchlistClient letterboxd,
        ITmdbMovieSearch tmdb,
        IAddToWatchlistHandler addToWatchlist,
        ILogger<LetterboxdWatchlistSynchronizer> logger)
    {
        _watchlist = watchlist;
        _letterboxd = letterboxd;
        _tmdb = tmdb;
        _addToWatchlist = addToWatchlist;
        _logger = logger;
    }

    public async Task<LetterboxdSyncOutcome> SyncAsync(User user, CancellationToken ct = default)
    {
        var snapshot = await _letterboxd.GetWatchlistAsync(user.LetterboxdUsername ?? string.Empty, ct);
        if (!snapshot.IsComplete)
        {
            _logger.LogWarning(
                "Lecture incomplète de la watchlist Letterboxd de {Username} : aucune modification appliquée",
                user.LetterboxdUsername);
            return Failed(
                $"Watchlist Letterboxd de « {user.LetterboxdUsername} » inaccessible. "
                + "Vérifiez l'orthographe du pseudo et que votre profil Letterboxd est public.");
        }

        var items = await _watchlist.ListByUserIdAsync(user.Id, int.MaxValue, ct);
        var onLetterboxd = snapshot.Films
            .Select(f => f.Slug)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var removed = await RemoveDepartedAsync(user.Id, items, onLetterboxd, ct);
        var addition = await AddMissingAsync(user.Id, items, snapshot.Films, ct);

        return new LetterboxdSyncOutcome(
            Succeeded: true,
            Error: null,
            Added: addition.Added,
            Removed: removed,
            UnmatchedTitles: addition.UnmatchedTitles,
            PendingChoices: addition.PendingChoices,
            TotalOnLetterboxd: snapshot.Films.Count,
            TotalTruncated: Math.Max(0, snapshot.Films.Count - LetterboxdImportLimits.MaxRows));
    }

    private static LetterboxdSyncOutcome Failed(string error) =>
        new(false, error, 0, 0, [], [], 0, 0);

    private async Task<int> RemoveDepartedAsync(
        string userId,
        IReadOnlyList<WatchlistItem> items,
        HashSet<string> onLetterboxd,
        CancellationToken ct)
    {
        var removed = 0;
        foreach (var item in items)
        {
            if (string.IsNullOrEmpty(item.LetterboxdSlug) || onLetterboxd.Contains(item.LetterboxdSlug))
                continue;

            if (await _watchlist.RemoveAsync(userId, item.TmdbId, item.MediaType, ct))
                removed++;
        }

        return removed;
    }

    private async Task<AdditionResult> AddMissingAsync(
        string userId,
        IReadOnlyList<WatchlistItem> items,
        IReadOnlyList<LetterboxdFilm> films,
        CancellationToken ct)
    {
        var knownSlugs = items
            .Where(i => !string.IsNullOrEmpty(i.LetterboxdSlug))
            .Select(i => i.LetterboxdSlug!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var knownTmdbKeys = items.Select(i => (i.TmdbId, i.MediaType)).ToHashSet();

        var added = 0;
        var unmatched = new List<string>();
        var pending = new List<LetterboxdImportRowResponse>();
        var rowIndex = 0;

        foreach (var film in films.Take(LetterboxdImportLimits.MaxRows))
        {
            if (ct.IsCancellationRequested)
                break;
            if (knownSlugs.Contains(film.Slug))
                continue;

            rowIndex++;
            var candidates = await LetterboxdTmdbMatcher.FindCandidatesAsync(_tmdb, film.Title, film.Year, ct);
            if (candidates.Count == 0)
            {
                unmatched.Add(FormatFilm(film));
                continue;
            }

            var confident = LetterboxdTmdbMatcher.SelectConfident(film.Title, candidates);
            if (confident is null)
            {
                pending.Add(await ToRowAsync(rowIndex, film, candidates, ct));
                continue;
            }

            if (knownTmdbKeys.Contains((confident.Id, confident.MediaType)))
            {
                await _watchlist.SetLetterboxdSlugAsync(
                    userId, confident.Id, confident.MediaType, film.Slug, ct);
                continue;
            }

            await _addToWatchlist.HandleAsync(userId, ToAddRequest(confident, film.Slug), ct);
            knownTmdbKeys.Add((confident.Id, confident.MediaType));
            added++;
        }

        return new AdditionResult(added, unmatched, pending);
    }

    private static string FormatFilm(LetterboxdFilm film) =>
        film.Year.Length > 0 ? $"{film.Title} ({film.Year})" : film.Title;

    private static AddWatchlistItemRequest ToAddRequest(TmdbSearchItem item, string slug) => new()
    {
        TmdbId = item.Id,
        MediaType = item.MediaType,
        Title = item.Title,
        Year = item.Year,
        PosterPath = item.PosterPath,
        VoteAverage = item.VoteAverage,
        LetterboxdSlug = slug
    };

    private async Task<LetterboxdImportRowResponse> ToRowAsync(
        int rowIndex,
        LetterboxdFilm film,
        IReadOnlyList<TmdbSearchItem> candidates,
        CancellationToken ct)
    {
        var runtimes = await Task.WhenAll(candidates.Select(c => GetRuntimeAsync(c.Id, c.MediaType, ct)));
        var withCandidates = candidates.Select((c, i) => new LetterboxdImportCandidateResponse
        {
            TmdbId = c.Id,
            MediaType = c.MediaType,
            Title = c.Title,
            Year = c.Year,
            PosterPath = c.PosterPath,
            VoteAverage = c.VoteAverage,
            GenreIds = c.GenreIds ?? [],
            RuntimeMinutes = runtimes[i]
        }).ToList();

        return new LetterboxdImportRowResponse
        {
            RowIndex = rowIndex,
            Title = film.Title,
            Year = film.Year,
            LetterboxdSlug = film.Slug,
            Candidates = withCandidates
        };
    }

    private async Task<int?> GetRuntimeAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
            return details?.Runtime;
        }
        catch (HttpRequestException)
        {
            return null;
        }
    }

    private sealed record AdditionResult(
        int Added,
        IReadOnlyList<string> UnmatchedTitles,
        IReadOnlyList<LetterboxdImportRowResponse> PendingChoices);
}
