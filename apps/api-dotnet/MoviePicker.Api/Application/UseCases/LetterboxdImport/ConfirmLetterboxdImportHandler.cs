using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandler : IConfirmLetterboxdImportHandler
{
    private const int MaxSelections = LetterboxdImportLimits.MaxRows;

    private readonly IWatchlistRepository _watchlist;
    private readonly IAddToWatchlistHandler _addToWatchlist;
    private readonly IUserRepository _users;
    private readonly LetterboxdWatchedWriter _watchedWriter;
    private readonly LetterboxdLinkedCounter _linkedCounter;
    private readonly IUsageRecorder _usage;

    public ConfirmLetterboxdImportHandler(
        IWatchlistRepository watchlist,
        IAddToWatchlistHandler addToWatchlist,
        IUserRepository users,
        LetterboxdWatchedWriter watchedWriter,
        LetterboxdLinkedCounter linkedCounter,
        IUsageRecorder usage)
    {
        _watchlist = watchlist;
        _addToWatchlist = addToWatchlist;
        _users = users;
        _watchedWriter = watchedWriter;
        _linkedCounter = linkedCounter;
        _usage = usage;
    }

    public async Task<LetterboxdImportConfirmResponse> HandleAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct = default)
    {
        var watchedSelections = request.WatchedSelections ?? [];
        if (request.Selections.Count > MaxSelections || watchedSelections.Count > MaxSelections)
            throw Errors.TooManySelections(MaxSelections);

        var (added, alreadyPresent) = await ConfirmWatchlistAsync(userId, request.Selections, ct);
        var (watchedAdded, watchedAlreadyPresent) = await ConfirmWatchedAsync(userId, watchedSelections, ct);

        var pendingCount = await PersistPendingCountAsync(
            userId,
            request.Selections.Count + watchedSelections.Count,
            request.RemainingUnresolvedCount,
            ct);
        if (request.Selections.Count + watchedSelections.Count > 0)
            await _linkedCounter.RefreshAsync(userId, ct);
        await _usage.RecordAsync(
            UsageCount.LetterboxdChoicesConfirmed(request.Selections.Count + watchedSelections.Count), ct);

        return new LetterboxdImportConfirmResponse
        {
            Added = added,
            AlreadyPresent = alreadyPresent,
            WatchedAdded = watchedAdded,
            WatchedAlreadyPresent = watchedAlreadyPresent,
            PendingReconciliationCount = pendingCount
        };
    }

    private async Task<(int Added, int AlreadyPresent)> ConfirmWatchlistAsync(
        string userId,
        IReadOnlyList<AddWatchlistItemRequest> selections,
        CancellationToken ct)
    {
        if (selections.Count == 0)
            return (0, 0);

        var added = 0;
        var alreadyPresent = 0;
        var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
        var existingKeys = existingItems.Select(i => (i.TmdbId, i.MediaType)).ToHashSet();

        foreach (var selection in selections)
        {
            if (existingKeys.Contains((selection.TmdbId, selection.MediaType)))
            {
                alreadyPresent++;
                if (!string.IsNullOrWhiteSpace(selection.LetterboxdSlug))
                {
                    await _watchlist.SetLetterboxdSlugAsync(
                        userId,
                        selection.TmdbId,
                        selection.MediaType,
                        selection.LetterboxdSlug.Trim(),
                        ct);
                }

                continue;
            }

            await _addToWatchlist.HandleAsync(userId, selection, ct);
            added++;
        }

        return (added, alreadyPresent);
    }

    private async Task<(int Added, int AlreadyPresent)> ConfirmWatchedAsync(
        string userId,
        IReadOnlyList<LetterboxdWatchedSelectionRequest> selections,
        CancellationToken ct)
    {
        var added = 0;
        foreach (var selection in selections)
        {
            var toWatch = await _watchlist.GetOneAsync(userId, selection.TmdbId, selection.MediaType, ct);
            var keepOnWatchlist = !string.IsNullOrEmpty(toWatch?.LetterboxdSlug);
            if ((await _watchedWriter.WriteAsync(userId, selection, keepOnWatchlist, ct)).Added)
                added++;
        }

        return (added, selections.Count - added);
    }

    private async Task<int> PersistPendingCountAsync(
        string userId,
        int resolvedCount,
        int? remainingUnresolvedCount,
        CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw Errors.UserNotFound();
        var current = user.LetterboxdPendingReconciliationCount;
        var floor = Math.Max(0, current - resolvedCount);
        var requested = remainingUnresolvedCount is >= 0
            ? remainingUnresolvedCount.Value
            : floor;
        var pendingCount = Math.Min(
            Math.Clamp(requested, floor, current),
            LetterboxdImportLimits.MaxPendingChoices);

        await _users.SetLetterboxdPendingReconciliationCountAsync(userId, pendingCount, ct);
        return pendingCount;
    }
}
