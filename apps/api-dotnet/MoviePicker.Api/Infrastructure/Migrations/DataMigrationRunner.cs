using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class DataMigrationRunner : BackgroundService
{
    private static readonly TimeSpan DefaultStartupDelay = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan LeaseDuration = TimeSpan.FromMinutes(30);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly ILogger<DataMigrationRunner> _logger;
    private readonly TimeSpan _startupDelay;
    private readonly string _holder = Guid.NewGuid().ToString("N");

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
                var repeatable = migration is IRepeatableDataMigration;
                if (!repeatable && await history.IsAppliedAsync(migration.Id, stoppingToken))
                    continue;

                if (!await history.TryAcquireLeaseAsync(migration.Id, _holder, _clock.GetUtcNow(), LeaseDuration, stoppingToken))
                {
                    _logger.LogInformation(
                        "Migration {MigrationId} is running on another instance, which applies the remaining ones",
                        migration.Id);
                    return;
                }

                try
                {
                    if (!repeatable && await history.IsAppliedAsync(migration.Id, stoppingToken))
                        continue;

                    var affected = await migration.ExecuteAsync(stoppingToken);
                    if (!repeatable)
                        await history.MarkAppliedAsync(migration.Id, affected, _clock.GetUtcNow(), stoppingToken);
                    _logger.LogInformation(
                        "Migration {MigrationId} applied: {Affected} document(s) updated",
                        migration.Id,
                        affected);
                }
                finally
                {
                    await ReleaseLeaseAsync(history, migration.Id);
                }
            }
            catch (OperationCanceledException)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Migration {MigrationId} failed: it will be replayed at the next startup",
                    migration.Id);
            }
        }
    }

    private async Task ReleaseLeaseAsync(IMigrationHistoryRepository history, string migrationId)
    {
        try
        {
            await history.ReleaseLeaseAsync(migrationId, _holder, CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Lease of migration {MigrationId} not released: it expires on its own after {LeaseDuration}",
                migrationId,
                LeaseDuration);
        }
    }
}
