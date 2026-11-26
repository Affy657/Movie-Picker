using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed record LetterboxdWriteCount(int Added, int AlreadyPresent);

public sealed class LetterboxdSelectionsWriter
{
    private readonly IWatchlistRepository _watchlist;
    private readonly IAddToWatchlistHandler _addToWatchlist;
    private readonly LetterboxdWatchedWriter _watchedWriter;

    public LetterboxdSelectionsWriter(
        IWatchlistRepository watchlist,
        IAddToWatchlistHandler addToWatchlist,
        LetterboxdWatchedWriter watchedWriter)
    {
        _watchlist = watchlist;
        _addToWatchlist = addToWatchlist;
        _watchedWriter = watchedWriter;
    }

    public async Task<LetterboxdWriteCount> WriteWatchlistAsync(
        string userId,
        IReadOnlyList<AddWatchlistItemRequest> selections,
        CancellationToken ct)
    {
        if (selections.Count == 0)
            return new LetterboxdWriteCount(0, 0);

        var added = 0;
        var alreadyPresent = 0;
        var existingItems = await _watchlist.ListByUserIdAsync(userId, int.MaxValue, ct);
        var existingKeys = existingItems.Select(i => (i.TmdbId, i.MediaType)).ToHashSet();

        foreach (var selection in selections)
        {
            if (!existingKeys.Add((selection.TmdbId, selection.MediaType)))
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

            if (await _addToWatchlist.TryAddKnownTitleAsync(userId, selection, ct))
                added++;
        }

        return new LetterboxdWriteCount(added, alreadyPresent);
    }

    public async Task<LetterboxdWriteCount> WriteWatchedAsync(
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

        return new LetterboxdWriteCount(added, selections.Count - added);
    }
}
