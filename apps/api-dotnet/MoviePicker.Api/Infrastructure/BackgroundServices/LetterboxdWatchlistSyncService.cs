using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

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
                    using var scope = _scopeFactory.CreateScope();
                    var runner = new LetterboxdWatchlistSyncRunner(
                        scope.ServiceProvider.GetRequiredService<IUserRepository>(),
                        scope.ServiceProvider.GetRequiredService<IWatchlistRepository>(),
                        scope.ServiceProvider.GetRequiredService<ILetterboxdWatchlistClient>(),
                        _logger);
                    await runner.RunAsync(stoppingToken);
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
}
