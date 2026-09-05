using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class DataMigrationRunner : BackgroundService
{
    private static readonly TimeSpan DefaultStartupDelay = TimeSpan.FromSeconds(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly ILogger<DataMigrationRunner> _logger;
    private readonly TimeSpan _startupDelay;

    public DataMigrationRunner(
        IServiceScopeFactory scopeFactory,
        TimeProvider clock,
        ILogger<DataMigrationRunner> logger,
        TimeSpan? startupDelay = null)
    {
        _scopeFactory = scopeFactory;
        _clock = clock;
        _logger = logger;
        _startupDelay = startupDelay ?? DefaultStartupDelay;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(_startupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var history = scope.ServiceProvider.GetRequiredService<IMigrationHistoryRepository>();
        var migrations = scope.ServiceProvider
            .GetServices<IDataMigration>()
            .OrderBy(m => m.Id, StringComparer.Ordinal)
            .ToList();

        foreach (var migration in migrations)
        {
            if (stoppingToken.IsCancellationRequested)
                return;

            try
            {
                if (await history.IsAppliedAsync(migration.Id, stoppingToken))
                    continue;

                var affected = await migration.ExecuteAsync(stoppingToken);
                await history.MarkAppliedAsync(migration.Id, affected, _clock.GetUtcNow(), stoppingToken);
                _logger.LogInformation(
                    "Migration {MigrationId} appliquée : {Affected} document(s) mis à jour",
                    migration.Id,
                    affected);
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Migration {MigrationId} en échec : elle sera rejouée au prochain démarrage",
                    migration.Id);
            }
        }
    }
}
