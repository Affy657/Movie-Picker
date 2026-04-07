using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

/// <summary>Crée les index V1 au démarrage (idempotent si définition inchangée).</summary>
public sealed class MongoIndexInitializer : IHostedService
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<MongoIndexInitializer> _logger;

    public MongoIndexInitializer(IMongoDatabase database, ILogger<MongoIndexInitializer> logger)
    {
        _database = database;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            await EnsureUserIndexesAsync(cancellationToken);
            await EnsureEventIndexesAsync(cancellationToken);
            await EnsureParticipantIndexesAsync(cancellationToken);
            await EnsureAuthSessionIndexesAsync(cancellationToken);
            await EnsureReactionIndexesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Échec création index MongoDB");
            throw;
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task EnsureUserIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<UserDocument>("users");
        var email = new CreateIndexModel<UserDocument>(
            Builders<UserDocument>.IndexKeys.Ascending(x => x.Email),
            new CreateIndexOptions { Name = "users_email_unique", Unique = true });
        await col.Indexes.CreateOneAsync(email, cancellationToken: ct);
    }

    private async Task EnsureEventIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<EventDocument>("events");
        var creator = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.CreatorUserId),
            new CreateIndexOptions { Name = "events_creatorUserId", Sparse = true });
        await col.Indexes.CreateOneAsync(creator, cancellationToken: ct);
    }

    private async Task EnsureParticipantIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<ParticipantDocument>("participants");

        var eventUserUnique = new CreateIndexModel<ParticipantDocument>(
            Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.EventId).Ascending(x => x.UserId),
            new CreateIndexOptions<ParticipantDocument>
            {
                Name = "participants_eventId_userId_unique",
                Unique = true,
                PartialFilterExpression = Builders<ParticipantDocument>.Filter.Exists(x => x.UserId, true)
            });

        var byUser = new CreateIndexModel<ParticipantDocument>(
            Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "participants_userId", Sparse = true });

        await col.Indexes.CreateManyAsync(new[] { eventUserUnique, byUser }, ct);
    }

    private async Task EnsureAuthSessionIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<AuthSessionDocument>("auth_sessions");
        var ttl = new CreateIndexModel<AuthSessionDocument>(
            Builders<AuthSessionDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
            new CreateIndexOptions { Name = "auth_sessions_expires_ttl", ExpireAfter = TimeSpan.Zero });
        await col.Indexes.CreateOneAsync(ttl, cancellationToken: ct);

        var byUser = new CreateIndexModel<AuthSessionDocument>(
            Builders<AuthSessionDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "auth_sessions_userId", Sparse = true });
        await col.Indexes.CreateOneAsync(byUser, cancellationToken: ct);
    }

    private async Task EnsureReactionIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<ReactionDocument>("reactions");
        var unique = new CreateIndexModel<ReactionDocument>(
            Builders<ReactionDocument>.IndexKeys
                .Ascending(x => x.EventId)
                .Ascending(x => x.MovieId)
                .Ascending(x => x.ParticipantId)
                .Ascending(x => x.ReactionId),
            new CreateIndexOptions<ReactionDocument>
            {
                Name = "reactions_event_movie_participant_reaction_unique",
                Unique = true
            });
        var byMovie = new CreateIndexModel<ReactionDocument>(
            Builders<ReactionDocument>.IndexKeys.Ascending(x => x.MovieId),
            new CreateIndexOptions { Name = "reactions_movieId" });
        await col.Indexes.CreateManyAsync(new[] { unique, byMovie }, ct);
    }
}
