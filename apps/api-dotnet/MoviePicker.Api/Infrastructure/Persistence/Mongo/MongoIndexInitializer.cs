using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

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
            await EnsureMovieIndexesAsync(cancellationToken);
            await EnsureVoteIndexesAsync(cancellationToken);
            await EnsureAuthSessionIndexesAsync(cancellationToken);
            await EnsureSeenMarkIndexesAsync(cancellationToken);
            await EnsurePasswordResetTokenIndexesAsync(cancellationToken);
            await EnsurePushSubscriptionIndexesAsync(cancellationToken);
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
        var handle = new CreateIndexModel<UserDocument>(
            Builders<UserDocument>.IndexKeys.Ascending(x => x.Handle),
            new CreateIndexOptions<UserDocument>
            {
                Name = "users_handle_unique",
                Unique = true,
                PartialFilterExpression = Builders<UserDocument>.Filter.Exists(x => x.Handle, true)
            });
        await col.Indexes.CreateManyAsync(new[] { email, handle }, ct);
    }

    private async Task EnsureEventIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<EventDocument>("events");
        var slug = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.Slug),
            new CreateIndexOptions { Name = "events_slug_unique", Unique = true });
        var creator = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.CreatorUserId),
            new CreateIndexOptions { Name = "events_creatorUserId", Sparse = true });
        await col.Indexes.CreateManyAsync(new[] { slug, creator }, ct);
    }

    private async Task EnsureMovieIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<MovieDocument>("movies");
        var byEvent = new CreateIndexModel<MovieDocument>(
            Builders<MovieDocument>.IndexKeys.Ascending(x => x.EventId),
            new CreateIndexOptions { Name = "movies_eventId" });
        var byEventTmdb = new CreateIndexModel<MovieDocument>(
            Builders<MovieDocument>.IndexKeys.Ascending(x => x.EventId).Ascending(x => x.TmdbId),
            new CreateIndexOptions { Name = "movies_eventId_tmdbId_unique", Unique = true });
        await col.Indexes.CreateManyAsync(new[] { byEvent, byEventTmdb }, ct);
    }

    private async Task EnsureVoteIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<VoteDocument>("votes");
        var byMovie = new CreateIndexModel<VoteDocument>(
            Builders<VoteDocument>.IndexKeys.Ascending(x => x.MovieId),
            new CreateIndexOptions { Name = "votes_movieId" });
        var unique = new CreateIndexModel<VoteDocument>(
            Builders<VoteDocument>.IndexKeys
                .Ascending(x => x.EventId)
                .Ascending(x => x.MovieId)
                .Ascending(x => x.ParticipantId),
            new CreateIndexOptions { Name = "votes_event_movie_participant_unique", Unique = true });
        await col.Indexes.CreateManyAsync(new[] { byMovie, unique }, ct);
    }

    private async Task EnsureParticipantIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<ParticipantDocument>("participants");

        await DropIndexIfExistsAsync(col, "participants_eventId_pseudo", ct);

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

        var eventPseudo = new CreateIndexModel<ParticipantDocument>(
            Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.EventId).Ascending(x => x.Pseudo),
            new CreateIndexOptions { Name = "participants_eventId_pseudo_unique", Unique = true });

        var eventCreated = new CreateIndexModel<ParticipantDocument>(
            Builders<ParticipantDocument>.IndexKeys.Ascending(x => x.EventId).Ascending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "participants_eventId_createdAt" });

        await col.Indexes.CreateManyAsync(new[] { eventUserUnique, byUser, eventPseudo, eventCreated }, ct);
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

    private async Task EnsurePasswordResetTokenIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<PasswordResetTokenDocument>("password_reset_tokens");
        var tokenHash = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.TokenHash),
            new CreateIndexOptions { Name = "password_reset_tokens_tokenHash_unique", Unique = true });
        var byUser = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "password_reset_tokens_userId", Sparse = true });
        var ttl = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
            new CreateIndexOptions { Name = "password_reset_tokens_expires_ttl", ExpireAfter = TimeSpan.Zero });
        await col.Indexes.CreateManyAsync(new[] { tokenHash, byUser, ttl }, ct);
    }

    private async Task EnsureSeenMarkIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<SeenMarkDocument>("seen_marks");
        var unique = new CreateIndexModel<SeenMarkDocument>(
            Builders<SeenMarkDocument>.IndexKeys
                .Ascending(x => x.EventId)
                .Ascending(x => x.MovieId)
                .Ascending(x => x.ParticipantId),
            new CreateIndexOptions<SeenMarkDocument>
            {
                Name = "seen_marks_event_movie_participant_unique",
                Unique = true
            });
        var byMovie = new CreateIndexModel<SeenMarkDocument>(
            Builders<SeenMarkDocument>.IndexKeys.Ascending(x => x.MovieId),
            new CreateIndexOptions { Name = "seen_marks_movieId" });
        await col.Indexes.CreateManyAsync(new[] { unique, byMovie }, ct);
    }

    private async Task EnsurePushSubscriptionIndexesAsync(CancellationToken ct)
    {
        var col = _database.GetCollection<PushSubscriptionDocument>("push_subscriptions");
        var unique = new CreateIndexModel<PushSubscriptionDocument>(
            Builders<PushSubscriptionDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.Endpoint),
            new CreateIndexOptions { Name = "push_subscriptions_userId_endpoint_unique", Unique = true });
        var byUser = new CreateIndexModel<PushSubscriptionDocument>(
            Builders<PushSubscriptionDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "push_subscriptions_userId" });
        await col.Indexes.CreateManyAsync(new[] { unique, byUser }, ct);
    }

    private static async Task DropIndexIfExistsAsync<T>(IMongoCollection<T> col, string name, CancellationToken ct)
    {
        try { await col.Indexes.DropOneAsync(name, ct); }
        catch (MongoCommandException ex) when (ex.Code == MongoErrorCodes.IndexNotFound) { }
    }
}
