using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.BackgroundServices;

public sealed class LetterboxdWatchlistSyncService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LetterboxdWatchlistSyncService> _logger;

    public LetterboxdWatchlistSyncService(
        IServiceScopeFactory scopeFactory,
        ILogger<LetterboxdWatchlistSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await SyncAllAsync(stoppingToken);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogError(ex, "Erreur lors de la synchronisation des watchlists Letterboxd");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Arrêt normal du service (annulation demandée) — rien à faire.
        }
    }

    private async Task SyncAllAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var watchlist = scope.ServiceProvider.GetRequiredService<IWatchlistRepository>();
        var rss = scope.ServiceProvider.GetRequiredService<ILetterboxdRssClient>();

        var candidates = await users.ListWithLetterboxdSyncEnabledAsync(ct);
        var removed = 0;
        foreach (var user in candidates)
        {
            if (ct.IsCancellationRequested)
                break;
            try
            {
                removed += await SyncUserAsync(user, watchlist, rss, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Échec de synchronisation Letterboxd pour l'utilisateur {UserId}", user.Id);
            }
        }

        if (removed > 0)
            _logger.LogInformation("Sync Letterboxd : {Removed} film(s) retiré(s) des watchlists", removed);
    }

    private static async Task<int> SyncUserAsync(
        User user,
        IWatchlistRepository watchlist,
        ILetterboxdRssClient rss,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.LetterboxdUsername))
            return 0;

        var items = await watchlist.ListByUserIdAsync(user.Id, ct: ct);
        if (items.Count == 0)
            return 0;

        var diary = await rss.GetRecentDiaryAsync(user.LetterboxdUsername, ct);
        if (diary.Count == 0)
            return 0;

        var watchedTmdbIds = diary
            .Where(d => d.TmdbId.HasValue)
            .Select(d => d.TmdbId!.Value)
            .ToHashSet();
        var watchedTitleYears = diary
            .Where(d => !d.TmdbId.HasValue)
            .Select(d => (d.FilmTitle.Trim().ToLowerInvariant(), d.FilmYear.Trim()))
            .ToHashSet();

        var removed = 0;
        foreach (var item in items)
        {
            var isWatched = watchedTmdbIds.Contains(item.TmdbId)
                || watchedTitleYears.Contains((item.Title.Trim().ToLowerInvariant(), item.Year.Trim()));
            if (!isWatched)
                continue;

            if (await watchlist.RemoveAsync(user.Id, item.TmdbId, item.MediaType, ct))
                removed++;
        }

        return removed;
    }
}
