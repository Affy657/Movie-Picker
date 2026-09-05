using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUnitOfWork : IUnitOfWork
{
    private static int _transactionsUnavailableLogged;

    private readonly IMongoClient _client;
    private readonly MongoSessionAccessor _sessions;
    private readonly ILogger<MongoUnitOfWork> _logger;

    public MongoUnitOfWork(
        IMongoClient client,
        MongoSessionAccessor sessions,
        ILogger<MongoUnitOfWork> logger)
    {
        _client = client;
        _sessions = sessions;
        _logger = logger;
    }

    public async Task ExecuteAsync(Func<CancellationToken, Task> work, CancellationToken ct = default)
    {
        if (_sessions.Session is not null)
        {
            await work(ct);
            return;
        }

        using var session = await _client.StartSessionAsync(cancellationToken: ct);
        _sessions.Session = session;
        try
        {
            await session.WithTransactionAsync(
                async (_, token) =>
                {
                    await work(token);
                    return true;
                },
                cancellationToken: ct);
        }
        catch (MongoException ex) when (IsTransactionUnsupported(ex))
        {
            _sessions.Session = null;
            WarnOnce(ex);
            await work(ct);
        }
        finally
        {
            _sessions.Session = null;
        }
    }

    private static bool IsTransactionUnsupported(MongoException ex) =>
        ex is MongoClientException
        || (ex is MongoCommandException command
            && (command.Code == 20
                || command.Message.Contains("replica set", StringComparison.OrdinalIgnoreCase)
                || command.Message.Contains("Transaction numbers", StringComparison.OrdinalIgnoreCase)));

    private void WarnOnce(MongoException ex)
    {
        if (Interlocked.Exchange(ref _transactionsUnavailableLogged, 1) == 1)
            return;

        _logger.LogWarning(
            ex,
            "MongoDB ne supporte pas les transactions sur cette instance (replica set requis) : "
                + "les écritures multi-documents s'exécutent sans atomicité");
    }
}
