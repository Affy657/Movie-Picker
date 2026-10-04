using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

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
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly ILogger<LetterboxdWatchlistSynchronizer> _logger;

    public LetterboxdWatchlistSynchronizer(
        IWatchlistRepository watchlist,
        ILetterboxdWatchlistClient letterboxd,
        ITmdbMovieSearch tmdb,
        IAddToWatchlistHandler addToWatchlist,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        ILogger<LetterboxdWatchlistSynchronizer> logger)
    {
        _watchlist = watchlist;
        _letterboxd = letterboxd;
        _tmdb = tmdb;
        _addToWatchlist = addToWatchlist;
        _participants = participants;
        _events = events;
        _movies = movies;
        _logger = logger;
    }

    public async Task<LetterboxdSyncOutcome> SyncAsync(User user, CancellationToken ct = default)
    {
        var snapshot = await _letterboxd.GetWatchlistAsync(user.LetterboxdUsername ?? string.Empty, ct);
        if (!snapshot.IsComplete)
        {
            _logger.LogWarning(
                "Incomplete read of the Letterboxd watchlist of {Username}: no change applied",
                user.LetterboxdUsername);
            return Failed(ErrorCodes.LetterboxdWatchlistIncomplete);
        }

        var items = await _watchlist.ListByUserIdAsync(user.Id, int.MaxValue, ct);
        var onLetterboxd = snapshot.Films
            .Select(f => f.Slug)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (snapshot.IsTruncated)
        {
            _logger.LogInformation(
                "Letterboxd watchlist of {Username} read up to {Read} of {Total} film(s): no film removed",
                user.LetterboxdUsername,
                snapshot.Films.Count,
                snapshot.Total);
        }

        var addition = await AddMissingAsync(user.Id, items, snapshot.Films, ct);
        var removed = snapshot.IsTruncated
            ? 0
            : await RemoveDepartedAsync(user.Id, items, onLetterboxd, addition.Relinked, ct);

        return new LetterboxdSyncOutcome(
            Succeeded: true,
            Error: null,
            Added: addition.Added,
            Removed: removed,
            UnmatchedTitles: addition.UnmatchedTitles,
            PendingChoices: addition.PendingChoices,
            TotalOnLetterboxd: snapshot.Total,
            TotalTruncated: Math.Max(0, snapshot.Total - LetterboxdImportLimits.MaxRows));
    }

    public static LetterboxdSyncOutcome Failed(string error) =>
        new(false, error, 0, 0, [], [], 0, 0);

    private async Task<int> RemoveDepartedAsync(
        string userId,
        IReadOnlyList<WatchlistItem> items,
        HashSet<string> onLetterboxd,
        IReadOnlySet<(int TmdbId, MovieMediaType MediaType)> relinked,
        CancellationToken ct)
    {
        var removed = 0;
        foreach (var item in items)
        {
            if (string.IsNullOrEmpty(item.LetterboxdSlug)
                || onLetterboxd.Contains(item.LetterboxdSlug)
                || relinked.Contains((item.TmdbId, item.MediaType)))
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
        var relinked = new HashSet<(int TmdbId, MovieMediaType MediaType)>();
        var rowIndex = 0;
        HashSet<(int TmdbId, MovieMediaType MediaType)>? watchedAtAMovieNight = null;

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

            var confident = LetterboxdTmdbMatcher.SelectConfident(film.Title, film.Year, candidates);
            if (confident is null)
            {
                pending.Add(await ToRowAsync(rowIndex, film, candidates, ct));
                continue;
            }

            if (knownTmdbKeys.Contains((confident.Id, confident.MediaType)))
            {
                await _watchlist.SetLetterboxdSlugAsync(
                    userId, confident.Id, confident.MediaType, film.Slug, ct);
                relinked.Add((confident.Id, confident.MediaType));
                continue;
            }

            watchedAtAMovieNight ??= await WatchedAtAMovieNightAsync(userId, ct);
            if (watchedAtAMovieNight.Contains((confident.Id, confident.MediaType)))
                continue;

            await _addToWatchlist.HandleAsync(userId, ToAddRequest(confident, film.Slug), ct);
            knownTmdbKeys.Add((confident.Id, confident.MediaType));
            added++;
        }

        return new AdditionResult(added, unmatched, pending, relinked);
    }

    private async Task<HashSet<(int TmdbId, MovieMediaType MediaType)>> WatchedAtAMovieNightAsync(
        string userId,
        CancellationToken ct)
    {
        var eventIds = await _participants.ListDistinctEventIdsByUserIdAsync(userId, ct);
        if (eventIds.Count == 0)
            return [];

        var winnerIds = (await _events.ListByIdsAsync(eventIds, ct))
            .Where(e => e.WatchlistCleanedAt is not null)
            .SelectMany(e => e.GetWinnerMovieIds())
            .ToList();
        if (winnerIds.Count == 0)
            return [];

        return (await _movies.ListByIdsAsync(winnerIds, ct))
            .Select(m => (m.TmdbId, m.MediaType))
            .ToHashSet();
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
        GenreIds = item.GenreIds,
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
        IReadOnlyList<LetterboxdImportRowResponse> PendingChoices,
        IReadOnlySet<(int TmdbId, MovieMediaType MediaType)> Relinked);
}
