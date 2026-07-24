using System.Diagnostics;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoDatabaseHealthProbe : IDatabaseHealthProbe
{
    private static readonly TimeSpan ProbeTimeout = TimeSpan.FromSeconds(3);

    private readonly IMongoDatabase _database;
    private readonly ILogger<MongoDatabaseHealthProbe> _logger;

    public MongoDatabaseHealthProbe(IMongoDatabase database, ILogger<MongoDatabaseHealthProbe> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task<DatabaseProbeResult> CheckAsync(CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(ProbeTimeout);

        try
        {
            await _database.RunCommandAsync<BsonDocument>(
                new BsonDocument("ping", 1),
                cancellationToken: timeout.Token);
            return new DatabaseProbeResult(DatabaseProbeStatus.Healthy, stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex) when (ex is MongoException or TimeoutException or OperationCanceledException)
        {
            _logger.LogError(ex, "Sonde de disponibilité MongoDB en échec après {DurationMs} ms", stopwatch.ElapsedMilliseconds);
            return new DatabaseProbeResult(DatabaseProbeStatus.Unavailable, stopwatch.ElapsedMilliseconds);
        }
    }
}
