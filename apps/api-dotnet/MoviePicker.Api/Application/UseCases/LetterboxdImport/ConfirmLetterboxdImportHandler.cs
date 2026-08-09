using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandler : IConfirmLetterboxdImportHandler
{
    private const int MaxSelections = LetterboxdCsvParser.MaxRows;

    private readonly IWatchlistRepository _watchlist;
    private readonly IAddToWatchlistHandler _addToWatchlist;

    public ConfirmLetterboxdImportHandler(IWatchlistRepository watchlist, IAddToWatchlistHandler addToWatchlist)
    {
        _watchlist = watchlist;
        _addToWatchlist = addToWatchlist;
    }

    public async Task<LetterboxdImportConfirmResponse> HandleAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct = default)
    {
        if (request.Selections.Count == 0)
            return new LetterboxdImportConfirmResponse { Added = 0, AlreadyPresent = 0 };

        if (request.Selections.Count > MaxSelections)
            throw new BadRequestException($"Trop d'éléments sélectionnés (maximum {MaxSelections}).");

        var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
        var existingKeys = existingItems.Select(i => (i.TmdbId, i.MediaType)).ToHashSet();

        var added = 0;
        var alreadyPresent = 0;
        foreach (var selection in request.Selections)
        {
            if (existingKeys.Contains((selection.TmdbId, selection.MediaType)))
            {
                alreadyPresent++;
                continue;
            }

            await _addToWatchlist.HandleAsync(userId, selection, ct);
            added++;
        }

        return new LetterboxdImportConfirmResponse { Added = added, AlreadyPresent = alreadyPresent };
    }
}
