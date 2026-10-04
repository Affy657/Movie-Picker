using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUnitOfWork : IUnitOfWork
{
    private const int IllegalOperationCode = 20;

    public static readonly TimeSpan DefaultTransactionBudget = TimeSpan.FromSeconds(15);

    private static int _transactionsUnavailableLogged;

    private readonly IMongoClient _client;
    private readonly MongoSessionAccessor _sessions;
    private readonly bool _isDevelopment;
    private readonly ILogger<MongoUnitOfWork> _logger;
    private readonly TimeSpan _transactionBudget;

    public MongoUnitOfWork(
        IMongoClient client,
        MongoSessionAccessor sessions,
        IHostEnvironment environment,
        ILogger<MongoUnitOfWork> logger,
        TimeSpan? transactionBudget = null)
    {
        _client = client;
        _sessions = sessions;
        _isDevelopment = environment.IsDevelopment();
        _logger = logger;
        _transactionBudget = transactionBudget ?? DefaultTransactionBudget;
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
        using var budget = CancellationTokenSource.CreateLinkedTokenSource(ct);
        budget.CancelAfter(_transactionBudget);
        try
        {
            await session.WithTransactionAsync(
                async (_, token) =>
                {
                    await work(token);
                    return true;
                },
                cancellationToken: budget.Token);
        }
        catch (OperationCanceledException abandoned) when (budget.IsCancellationRequested && !ct.IsCancellationRequested)
        {
            _logger.LogWarning(abandoned, "Transaction abandoned after retrying for {Budget}", _transactionBudget);
            throw Errors.ConcurrentUpdate();
        }
        catch (MongoException ex) when (ShouldRunWithoutTransaction(ex, _isDevelopment))
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

    internal static bool ShouldRunWithoutTransaction(MongoException ex, bool isDevelopment) =>
        isDevelopment
        && ex switch
        {
            MongoCommandException { Code: IllegalOperationCode } command => MentionsMissingReplicaSet(command.Message),
            MongoClientException client => MentionsMissingReplicaSet(client.Message),
            _ => false
        };

    private static bool MentionsMissingReplicaSet(string message) =>
        message.Contains("replica set", StringComparison.OrdinalIgnoreCase)
        || message.Contains("Transaction numbers", StringComparison.OrdinalIgnoreCase);

    private void WarnOnce(MongoException ex)
    {
        if (Interlocked.Exchange(ref _transactionsUnavailableLogged, 1) == 1)
            return;

        _logger.LogWarning(
            ex,
            "MongoDB does not support transactions on this instance (replica set required): "
                + "multi-document writes run without atomicity, tolerated in Development only");
    }
}
