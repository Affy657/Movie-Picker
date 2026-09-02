using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandler : IConfirmLetterboxdImportHandler
{
    private const int MaxSelections = LetterboxdImportLimits.MaxRows;

    private readonly IWatchlistRepository _watchlist;
    private readonly IAddToWatchlistHandler _addToWatchlist;
    private readonly IUserRepository _users;

    public ConfirmLetterboxdImportHandler(
        IWatchlistRepository watchlist,
        IAddToWatchlistHandler addToWatchlist,
        IUserRepository users)
    {
        _watchlist = watchlist;
        _addToWatchlist = addToWatchlist;
        _users = users;
    }

    public async Task<LetterboxdImportConfirmResponse> HandleAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct = default)
    {
        if (request.Selections.Count > MaxSelections)
            throw new BadRequestException($"Trop d'éléments sélectionnés (maximum {MaxSelections}).");

        var added = 0;
        var alreadyPresent = 0;
        if (request.Selections.Count > 0)
        {
            var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
            var existingKeys = existingItems.Select(i => (i.TmdbId, i.MediaType)).ToHashSet();

            foreach (var selection in request.Selections)
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
        }

        var pendingCount = await PersistPendingCountAsync(userId, request, ct);
        return new LetterboxdImportConfirmResponse
        {
            Added = added,
            AlreadyPresent = alreadyPresent,
            PendingReconciliationCount = pendingCount
        };
    }

    private async Task<int> PersistPendingCountAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("Utilisateur introuvable.");
        var current = user.LetterboxdPendingReconciliationCount;
        var floor = Math.Max(0, current - request.Selections.Count);
        var requested = request.RemainingUnresolvedCount is >= 0
            ? request.RemainingUnresolvedCount.Value
            : floor;
        var pendingCount = Math.Min(
            Math.Clamp(requested, floor, current),
            LetterboxdImportLimits.MaxRows);

        await _users.SetLetterboxdPendingReconciliationCountAsync(userId, pendingCount, ct);
        return pendingCount;
    }
}
