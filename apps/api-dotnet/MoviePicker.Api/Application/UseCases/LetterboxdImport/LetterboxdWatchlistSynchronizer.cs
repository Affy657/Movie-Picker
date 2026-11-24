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
    int TotalTruncated)
{
    public int WatchedAdded { get; init; }
    public int WatchedRemoved { get; init; }
    public IReadOnlyList<string> WatchedUnmatchedTitles { get; init; } = [];
    public IReadOnlyList<LetterboxdImportRowResponse> WatchedPendingChoices { get; init; } = [];
    public int WatchedTotalOnLetterboxd { get; init; }
    public int WatchedTotalTruncated { get; init; }
}

public sealed class LetterboxdWatchlistSynchronizer
{
    private static readonly LetterboxdSyncOutcome NothingToWatch = new(true, null, 0, 0, [], [], 0, 0);

    private readonly IWatchlistRepository _watchlist;
    private readonly IWatchedTitleRepository _watchedTitles;
    private readonly ILetterboxdWatchlistClient _letterboxd;
    private readonly LetterboxdTitleResolver _resolver;
    private readonly IAddToWatchlistHandler _addToWatchlist;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly LetterboxdWatchedSynchronizer _watched;
    private readonly LetterboxdSyncBudget _budget;
    private readonly ILogger<LetterboxdWatchlistSynchronizer> _logger;

    public LetterboxdWatchlistSynchronizer(
        IWatchlistRepository watchlist,
        IWatchedTitleRepository watchedTitles,
        ILetterboxdWatchlistClient letterboxd,
        ITmdbMovieSearch tmdb,
        IAddToWatchlistHandler addToWatchlist,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        LetterboxdWatchedSynchronizer watched,
        LetterboxdSyncBudget budget,
        ILogger<LetterboxdWatchlistSynchronizer> logger)
    {
        _watchlist = watchlist;
        _watchedTitles = watchedTitles;
        _letterboxd = letterboxd;
        _resolver = new LetterboxdTitleResolver(tmdb);
        _addToWatchlist = addToWatchlist;
        _participants = participants;
        _events = events;
        _movies = movies;
        _watched = watched;
        _budget = budget;
        _logger = logger;
    }

    public async Task<LetterboxdSyncOutcome> SyncAsync(User user, CancellationToken ct = default)
    {
        var username = user.LetterboxdUsername ?? string.Empty;
        using var syncBudget = CancellationTokenSource.CreateLinkedTokenSource(ct);
        syncBudget.CancelAfter(_budget.Total);
        var watchlistShare = user.LetterboxdSyncWatched ? _budget.FirstList : _budget.Total;

        var watchlist = user.LetterboxdSyncWatchlist
            ? await SyncWatchlistAsync(user, username, watchlistShare, syncBudget.Token, ct)
            : null;
        var watched = user.LetterboxdSyncWatched
            ? await SyncWatchedFilmsAsync(user, username, watchlist?.Snapshot, syncBudget.Token, ct)
            : null;

        var error = SyncError(watchlist?.Outcome, watched, user);
        if (error is not null && watchlist?.Outcome is null && watched is null)
            return Failed(error);

        var toWatch = watchlist?.Outcome ?? NothingToWatch;
        var watchedOutcome = watched ?? LetterboxdWatchedOutcome.None;
        return toWatch with
        {
            Error = error,
            Removed = toWatch.Removed + watchedOutcome.RemovedFromWatchlist,
            WatchedAdded = watchedOutcome.Added,
            WatchedRemoved = watchedOutcome.Removed,
            WatchedUnmatchedTitles = watchedOutcome.UnmatchedTitles,
            WatchedPendingChoices = watchedOutcome.PendingChoices,
            WatchedTotalOnLetterboxd = watchedOutcome.TotalOnLetterboxd,
            WatchedTotalTruncated = watchedOutcome.TotalTruncated
        };
    }

    public static LetterboxdSyncOutcome Failed(string error) =>
        new(false, error, 0, 0, [], [], 0, 0);

    private async Task<WatchlistPass> SyncWatchlistAsync(
        User user,
        string username,
        TimeSpan share,
        CancellationToken syncBudget,
        CancellationToken ct)
    {
        using var listBudget = CancellationTokenSource.CreateLinkedTokenSource(syncBudget);
        listBudget.CancelAfter(share);
        var snapshot = LetterboxdFilmsSnapshot.Failed();
        try
        {
            snapshot = await ReadAsync(_letterboxd.GetWatchlistAsync, "watchlist", username, listBudget.Token);
            return new WatchlistPass(
                snapshot,
                snapshot.IsComplete ? await ApplyWatchlistAsync(user, snapshot, listBudget.Token) : null);
        }
        catch (OperationCanceledException) when (listBudget.IsCancellationRequested && !ct.IsCancellationRequested)
        {
            LogOutOfBudget("watchlist", username, share);
            return new WatchlistPass(snapshot, null);
        }
    }

    private async Task<LetterboxdWatchedOutcome?> SyncWatchedFilmsAsync(
        User user,
        string username,
        LetterboxdFilmsSnapshot? watchlist,
        CancellationToken syncBudget,
        CancellationToken ct)
    {
        try
        {
            var snapshot = await ReadAsync(_letterboxd.GetWatchedFilmsAsync, "watched films", username, syncBudget);
            if (!snapshot.IsComplete)
                return null;

            var stillToWatch = await StillToWatchOnLetterboxdAsync(user.Id, watchlist, syncBudget);
            return await _watched.ApplyAsync(
                user.Id,
                snapshot,
                stillToWatch,
                LetterboxdPendingChoiceKey.WatchedSlugsOf(user.LetterboxdPendingChoiceKeys),
                syncBudget);
        }
        catch (OperationCanceledException) when (syncBudget.IsCancellationRequested && !ct.IsCancellationRequested)
        {
            LogOutOfBudget("watched films", username, _budget.Total);
            return null;
        }
    }

    private void LogOutOfBudget(string list, string username, TimeSpan budget) =>
        _logger.LogWarning(
            "Letterboxd {List} of {Username} not synced within its {Budget} budget: what was added stays, nothing removed",
            list,
            username,
            budget);

    private static string? SyncError(LetterboxdSyncOutcome? watchlist, LetterboxdWatchedOutcome? watched, User user)
    {
        if (user.LetterboxdSyncWatchlist && watchlist is null)
            return ErrorCodes.LetterboxdWatchlistIncomplete;
        return user.LetterboxdSyncWatched && watched is null ? ErrorCodes.LetterboxdWatchedIncomplete : null;
    }

    private async Task<LetterboxdFilmsSnapshot> ReadAsync(
        Func<string, CancellationToken, Task<LetterboxdFilmsSnapshot>> read,
        string list,
        string username,
        CancellationToken ct)
    {
        var snapshot = await read(username, ct);
        if (!snapshot.IsComplete)
        {
            _logger.LogWarning(
                "Incomplete read of the Letterboxd {List} of {Username}: no change applied to that list",
                list,
                username);
        }

        return snapshot;
    }

    private async Task<HashSet<string>?> StillToWatchOnLetterboxdAsync(
        string userId,
        LetterboxdFilmsSnapshot? watchlist,
        CancellationToken ct)
    {
        if (watchlist is null)
            return null;
        if (watchlist.IsComplete)
            return watchlist.Films.Select(film => film.Slug).ToHashSet(StringComparer.OrdinalIgnoreCase);

        return (await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct))
            .Where(item => !string.IsNullOrEmpty(item.LetterboxdSlug))
            .Select(item => item.LetterboxdSlug!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private async Task<LetterboxdSyncOutcome> ApplyWatchlistAsync(
        User user,
        LetterboxdFilmsSnapshot snapshot,
        CancellationToken ct)
    {
        var items = await _watchlist.ListByUserIdAsync(user.Id, int.MaxValue, ct);
        var onLetterboxd = snapshot.Films
            .Select(f => f.Slug)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!snapshot.ConfirmsDepartures)
        {
            _logger.LogInformation(
                "Letterboxd watchlist of {Username} read up to {Read} of {Total} film(s) without a confirmed count: no film removed",
                user.LetterboxdUsername,
                snapshot.Films.Count,
                snapshot.Total);
        }

        var addition = await AddMissingAsync(user.Id, items, snapshot.Films, ct);
        ct.ThrowIfCancellationRequested();
        var removed = snapshot.ConfirmsDepartures
            ? await RemoveDepartedAsync(user.Id, items, onLetterboxd, addition.Relinked, ct)
            : 0;

        return new LetterboxdSyncOutcome(
            Succeeded: true,
            Error: null,
            Added: addition.Added,
            Removed: removed,
            UnmatchedTitles: addition.UnmatchedTitles,
            PendingChoices: addition.PendingChoices,
            TotalOnLetterboxd: snapshot.Total,
            TotalTruncated: LetterboxdTitleResolver.TotalTruncated(snapshot, addition.UnknownFilms));
    }

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
        var unknown = films.Where(film => !knownSlugs.Contains(film.Slug)).ToList();

        var added = 0;
        var unmatched = new List<string>();
        var pending = new List<LetterboxdImportRowResponse>();
        var relinked = new HashSet<(int TmdbId, MovieMediaType MediaType)>();
        var rowIndex = 0;
        HashSet<(int TmdbId, MovieMediaType MediaType)>? alreadyWatched = null;

        foreach (var film in unknown.Take(LetterboxdImportLimits.MaxRows))
        {
            ct.ThrowIfCancellationRequested();
            rowIndex++;
            var resolution = await _resolver.ResolveAsync(rowIndex, film, LetterboxdImportTarget.Watchlist, ct);
            if (resolution.Unmatched is { } unmatchedTitle)
            {
                unmatched.Add(unmatchedTitle);
                continue;
            }

            if (resolution.Confident is not { } confident)
            {
                pending.Add(resolution.Pending!);
                continue;
            }

            if (knownTmdbKeys.Contains((confident.Id, confident.MediaType)))
            {
                await _watchlist.SetLetterboxdSlugAsync(
                    userId, confident.Id, confident.MediaType, film.Slug, ct);
                relinked.Add((confident.Id, confident.MediaType));
                continue;
            }

            alreadyWatched ??= await AlreadyWatchedAsync(userId, ct);
            if (alreadyWatched.Contains((confident.Id, confident.MediaType)))
                continue;

            await _addToWatchlist.HandleAsync(userId, ToAddRequest(confident, film.Slug), ct);
            knownTmdbKeys.Add((confident.Id, confident.MediaType));
            added++;
        }

        return new AdditionResult(added, unmatched, pending, relinked, unknown.Count);
    }

    private async Task<HashSet<(int TmdbId, MovieMediaType MediaType)>> AlreadyWatchedAsync(string userId, CancellationToken ct)
    {
        var atANightTask = WatchedAtAMovieNightAsync(userId, ct);
        var elsewhereTask = _watchedTitles.ListTitlesByOwnerAsync(userId, ct);
        await Task.WhenAll(atANightTask, elsewhereTask);
        var watched = await atANightTask;
        watched.UnionWith((await elsewhereTask).Select(title => (title.TmdbId, title.MediaType)));
        return watched;
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

    private sealed record WatchlistPass(LetterboxdFilmsSnapshot Snapshot, LetterboxdSyncOutcome? Outcome);

    private sealed record AdditionResult(
        int Added,
        IReadOnlyList<string> UnmatchedTitles,
        IReadOnlyList<LetterboxdImportRowResponse> PendingChoices,
        IReadOnlySet<(int TmdbId, MovieMediaType MediaType)> Relinked,
        int UnknownFilms);
}
