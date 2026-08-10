using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class LetterboxdWatchlistSyncRunner
{
    private readonly IUserRepository _users;
    private readonly IWatchlistRepository _watchlist;
    private readonly ILetterboxdWatchlistClient _letterboxd;
    private readonly ILogger _logger;

    public LetterboxdWatchlistSyncRunner(
        IUserRepository users,
        IWatchlistRepository watchlist,
        ILetterboxdWatchlistClient letterboxd,
        ILogger logger)
    {
        _users = users;
        _watchlist = watchlist;
        _letterboxd = letterboxd;
        _logger = logger;
    }

    public async Task<int> RunAsync(CancellationToken ct = default)
    {
        var candidates = await _users.ListWithLetterboxdSyncEnabledAsync(ct);
        var removed = 0;
        foreach (var user in candidates)
        {
            if (ct.IsCancellationRequested)
                break;
            try
            {
                removed += await SyncUserAsync(user, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "Échec de synchronisation Letterboxd pour l'utilisateur {UserId}", user.Id);
            }
        }

        if (removed > 0)
            _logger.LogInformation("Sync Letterboxd : {Removed} film(s) retiré(s) des watchlists", removed);

        return removed;
    }

    private async Task<int> SyncUserAsync(User user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.LetterboxdUsername))
            return 0;

        var items = await _watchlist.ListByUserIdAsync(user.Id, int.MaxValue, ct);
        var tracked = items.Where(i => !string.IsNullOrEmpty(i.LetterboxdSlug)).ToList();
        if (tracked.Count == 0)
            return 0;

        var snapshot = await _letterboxd.GetWatchlistAsync(user.LetterboxdUsername, ct);
        if (!snapshot.IsComplete)
        {
            _logger.LogWarning(
                "Lecture incomplète de la watchlist Letterboxd de {Username} : aucun retrait effectué",
                user.LetterboxdUsername);
            return 0;
        }

        var stillOnLetterboxd = snapshot.Films
            .Select(f => f.Slug)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var removed = 0;
        foreach (var item in tracked)
        {
            if (stillOnLetterboxd.Contains(item.LetterboxdSlug!))
                continue;

            if (await _watchlist.RemoveAsync(user.Id, item.TmdbId, item.MediaType, ct))
                removed++;
        }

        return removed;
    }
}
