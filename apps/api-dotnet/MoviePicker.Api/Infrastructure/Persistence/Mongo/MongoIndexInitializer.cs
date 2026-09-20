using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Posters;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoIndexInitializer : IHostedService
{
    private readonly IMongoDatabase _database;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly TimeProvider _clock;
    private readonly ILogger<MongoIndexInitializer> _logger;

    public MongoIndexInitializer(
        IMongoDatabase database,
        IServiceScopeFactory scopeFactory,
        TimeProvider clock,
        ILogger<MongoIndexInitializer> logger)
    {
        _database = database;
        _scopeFactory = scopeFactory;
        _clock = clock;
        _logger = logger;
    }

    public string MarkerId => BuildPlan().MarkerId;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var plan = BuildPlan();
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var history = scope.ServiceProvider.GetRequiredService<IMigrationHistoryRepository>();
            if (await history.IsAppliedAsync(plan.MarkerId, cancellationToken))
            {
                _logger.LogInformation("MongoDB indexes already up to date ({MarkerId}).", plan.MarkerId);
                return;
            }

            await plan.ExecuteAsync(cancellationToken);
            await history.MarkAppliedAsync(plan.MarkerId, plan.StepCount, _clock.GetUtcNow(), cancellationToken);
            _logger.LogInformation("MongoDB indexes created ({MarkerId}).", plan.MarkerId);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("MongoDB index creation failed at startup", ex);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private MongoIndexPlan BuildPlan()
    {
        var plan = new MongoIndexPlan(_database);
        EnsureUserIndexes(plan);
        EnsureEventIndexes(plan);
        EnsureParticipantIndexes(plan);
        EnsureMovieIndexes(plan);
        EnsureVoteIndexes(plan);
        EnsureAuthSessionIndexes(plan);
        EnsureSeenMarkIndexes(plan);
        EnsureMovieRatingIndexes(plan);
        EnsurePasswordResetTokenIndexes(plan);
        EnsurePushSubscriptionIndexes(plan);
        EnsureFollowIndexes(plan);
        EnsureWatchlistIndexes(plan);
        EnsureUserNotificationIndexes(plan);
        EnsureKofiWebhookLogIndexes(plan);
        EnsurePushDedupIndexes(plan);
        EnsureRateLimitCounterIndexes(plan);
        EnsureSharedCacheIndexes(plan);
        EnsurePosterCacheIndexes(plan);
        return plan;
    }

    private static void EnsureUserIndexes(MongoIndexPlan plan)
    {
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
        var updatedAt = new CreateIndexModel<UserDocument>(
            Builders<UserDocument>.IndexKeys.Descending(x => x.UpdatedAt),
            new CreateIndexOptions { Name = "users_updatedAt" });
        var identity = new CreateIndexModel<UserDocument>(
            Builders<UserDocument>.IndexKeys
                .Ascending("identities.provider")
                .Ascending("identities.subject"),
            new CreateIndexOptions { Name = "users_identities_provider_subject_unique", Unique = true, Sparse = true });
        plan.Create("users", email, handle, updatedAt, identity);
    }

    private static void EnsureEventIndexes(MongoIndexPlan plan)
    {
        var slug = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.Slug),
            new CreateIndexOptions { Name = "events_slug_unique", Unique = true });
        var creator = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.CreatorUserId),
            new CreateIndexOptions { Name = "events_creatorUserId", Sparse = true });
        var recurrence = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.Recurrence).Ascending(x => x.CreatorUserId),
            new CreateIndexOptions { Name = "events_recurrence_creatorUserId", Sparse = true });
        var startAt = new CreateIndexModel<EventDocument>(
            Builders<EventDocument>.IndexKeys.Ascending(x => x.StartAtUtc),
            new CreateIndexOptions { Name = "events_startAtUtc", Sparse = true });
        plan.Create("events", slug, creator, recurrence, startAt);
    }

    private static void EnsureMovieIndexes(MongoIndexPlan plan)
    {
        var byEvent = new CreateIndexModel<MovieDocument>(
            Builders<MovieDocument>.IndexKeys.Ascending(x => x.EventId),
            new CreateIndexOptions { Name = "movies_eventId" });
        var byEventTmdb = new CreateIndexModel<MovieDocument>(
            Builders<MovieDocument>.IndexKeys.Ascending(x => x.EventId).Ascending(x => x.TmdbId),
            new CreateIndexOptions { Name = "movies_eventId_tmdbId_unique", Unique = true });
        plan.Create("movies", byEvent, byEventTmdb);
    }

    private static void EnsureVoteIndexes(MongoIndexPlan plan)
    {
        var byMovie = new CreateIndexModel<VoteDocument>(
            Builders<VoteDocument>.IndexKeys.Ascending(x => x.MovieId),
            new CreateIndexOptions { Name = "votes_movieId" });
        var unique = new CreateIndexModel<VoteDocument>(
            Builders<VoteDocument>.IndexKeys
                .Ascending(x => x.EventId)
                .Ascending(x => x.MovieId)
                .Ascending(x => x.ParticipantId),
            new CreateIndexOptions { Name = "votes_event_movie_participant_unique", Unique = true });
        plan.Create("votes", byMovie, unique);
    }

    private static void EnsureParticipantIndexes(MongoIndexPlan plan)
    {

        plan.DropIfExists<ParticipantDocument>("participants", "participants_eventId_pseudo");

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

        plan.Create("participants", eventUserUnique, byUser, eventPseudo, eventCreated);
    }

    private static void EnsureAuthSessionIndexes(MongoIndexPlan plan)
    {
        var ttl = new CreateIndexModel<AuthSessionDocument>(
            Builders<AuthSessionDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
            new CreateIndexOptions { Name = "auth_sessions_expires_ttl", ExpireAfter = TimeSpan.Zero });
        plan.Create("auth_sessions", ttl);

        var byUser = new CreateIndexModel<AuthSessionDocument>(
            Builders<AuthSessionDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "auth_sessions_userId", Sparse = true });
        plan.Create("auth_sessions", byUser);
    }

    private static void EnsurePasswordResetTokenIndexes(MongoIndexPlan plan)
    {
        var tokenHash = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.TokenHash),
            new CreateIndexOptions { Name = "password_reset_tokens_tokenHash_unique", Unique = true });
        var byUser = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "password_reset_tokens_userId", Sparse = true });
        var ttl = new CreateIndexModel<PasswordResetTokenDocument>(
            Builders<PasswordResetTokenDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
            new CreateIndexOptions { Name = "password_reset_tokens_expires_ttl", ExpireAfter = TimeSpan.Zero });
        plan.Create("password_reset_tokens", tokenHash, byUser, ttl);
    }

    private static void EnsureSeenMarkIndexes(MongoIndexPlan plan)
    {
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
        plan.Create("seen_marks", unique, byMovie);
    }

    private static void EnsureMovieRatingIndexes(MongoIndexPlan plan)
    {
        var unique = new CreateIndexModel<MovieRatingDocument>(
            Builders<MovieRatingDocument>.IndexKeys
                .Ascending(x => x.EventId)
                .Ascending(x => x.MovieId)
                .Ascending(x => x.ParticipantId),
            new CreateIndexOptions<MovieRatingDocument>
            {
                Name = "movie_ratings_event_movie_participant_unique",
                Unique = true
            });
        var byParticipant = new CreateIndexModel<MovieRatingDocument>(
            Builders<MovieRatingDocument>.IndexKeys.Ascending(x => x.ParticipantId),
            new CreateIndexOptions { Name = "movie_ratings_participantId" });
        plan.Create("movie_ratings", unique, byParticipant);
    }

    private static void EnsurePushSubscriptionIndexes(MongoIndexPlan plan)
    {
        var unique = new CreateIndexModel<PushSubscriptionDocument>(
            Builders<PushSubscriptionDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.Endpoint),
            new CreateIndexOptions { Name = "push_subscriptions_userId_endpoint_unique", Unique = true });
        var byUser = new CreateIndexModel<PushSubscriptionDocument>(
            Builders<PushSubscriptionDocument>.IndexKeys.Ascending(x => x.UserId),
            new CreateIndexOptions { Name = "push_subscriptions_userId" });
        plan.Create("push_subscriptions", unique, byUser);
    }

    private static void EnsureFollowIndexes(MongoIndexPlan plan)
    {
        var unique = new CreateIndexModel<FollowDocument>(
            Builders<FollowDocument>.IndexKeys
                .Ascending(x => x.FollowerId)
                .Ascending(x => x.FolloweeId),
            new CreateIndexOptions { Name = "follows_followerId_followeeId_unique", Unique = true });
        var byFollowerDate = new CreateIndexModel<FollowDocument>(
            Builders<FollowDocument>.IndexKeys
                .Ascending(x => x.FollowerId)
                .Descending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "follows_followerId_createdAt" });
        var byFolloweeDate = new CreateIndexModel<FollowDocument>(
            Builders<FollowDocument>.IndexKeys
                .Ascending(x => x.FolloweeId)
                .Descending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "follows_followeeId_createdAt" });
        plan.Create("follows", unique, byFollowerDate, byFolloweeDate);
    }

    private static void EnsureWatchlistIndexes(MongoIndexPlan plan)
    {
        var unique = new CreateIndexModel<WatchlistItemDocument>(
            Builders<WatchlistItemDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.TmdbId)
                .Ascending(x => x.MediaType),
            new CreateIndexOptions { Name = "watchlist_userId_tmdbId_mediaType_unique", Unique = true });
        var byUserDate = new CreateIndexModel<WatchlistItemDocument>(
            Builders<WatchlistItemDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Descending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "watchlist_userId_createdAt" });
        var missingRuntime = new CreateIndexModel<WatchlistItemDocument>(
            Builders<WatchlistItemDocument>.IndexKeys.Ascending(x => x.RuntimeMinutes),
            new CreateIndexOptions { Name = "watchlist_runtimeMinutes_missing" });
        plan.Create("watchlist", unique, byUserDate, missingRuntime);
    }

    private static void EnsureUserNotificationIndexes(MongoIndexPlan plan)
    {
        var byUser = new CreateIndexModel<UserNotificationDocument>(
            Builders<UserNotificationDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Descending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "user_notifications_userId_createdAt" });
        var unread = new CreateIndexModel<UserNotificationDocument>(
            Builders<UserNotificationDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.IsRead),
            new CreateIndexOptions { Name = "user_notifications_userId_isRead" });
        var byEvent = new CreateIndexModel<UserNotificationDocument>(
            Builders<UserNotificationDocument>.IndexKeys.Ascending(x => x.EventId),
            new CreateIndexOptions<UserNotificationDocument>
            {
                Name = "user_notifications_eventId",
                PartialFilterExpression = Builders<UserNotificationDocument>.Filter.Exists(x => x.EventId, true)
            });
        var ttl = new CreateIndexModel<UserNotificationDocument>(
            Builders<UserNotificationDocument>.IndexKeys.Ascending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "user_notifications_createdAt_ttl", ExpireAfter = TimeSpan.FromDays(90) });
        plan.Create("user_notifications", byUser, unread, byEvent, ttl);
    }

    private static void EnsurePushDedupIndexes(MongoIndexPlan plan)
    {
        plan.DropIfExists<PushDedupMarkerDocument>("push_dedup_markers", "push_dedup_markers_unique");
        var unique = new CreateIndexModel<PushDedupMarkerDocument>(
            Builders<PushDedupMarkerDocument>.IndexKeys
                .Ascending(x => x.UserId)
                .Ascending(x => x.Type)
                .Ascending(x => x.EventId)
                .Ascending(x => x.Channel),
            new CreateIndexOptions { Name = "push_dedup_markers_channel_unique", Unique = true });
        var ttl = new CreateIndexModel<PushDedupMarkerDocument>(
            Builders<PushDedupMarkerDocument>.IndexKeys.Ascending(x => x.CreatedAt),
            new CreateIndexOptions { Name = "push_dedup_markers_createdAt_ttl", ExpireAfter = TimeSpan.FromDays(3) });
        plan.Create("push_dedup_markers", unique, ttl);
    }

    private static void EnsureRateLimitCounterIndexes(MongoIndexPlan plan)
    {
        var ttl = new CreateIndexModel<RateLimitCounterDocument>(
            Builders<RateLimitCounterDocument>.IndexKeys.Ascending(x => x.ExpiresAt),
            new CreateIndexOptions { Name = "rate_limit_counters_expiresAt_ttl", ExpireAfter = TimeSpan.Zero });
        plan.Create("rate_limit_counters", ttl);
    }

    private static void EnsureSharedCacheIndexes(MongoIndexPlan plan)
    {
        var ttl = new CreateIndexModel<SharedCacheDocument>(
            Builders<SharedCacheDocument>.IndexKeys.Ascending(x => x.ExpiresAt),
            new CreateIndexOptions { Name = "shared_cache_expiresAt_ttl", ExpireAfter = TimeSpan.Zero });
        plan.Create(MongoSharedCache.CollectionName, ttl);
    }

    private static void EnsurePosterCacheIndexes(MongoIndexPlan plan)
    {
        var ttl = new CreateIndexModel<PosterCacheDocument>(
            Builders<PosterCacheDocument>.IndexKeys.Ascending(x => x.ExpiresAtUtc),
            new CreateIndexOptions { Name = "poster_cache_expiresAtUtc_ttl", ExpireAfter = TimeSpan.Zero });
        plan.Create(MongoPosterImageStore.CollectionName, ttl);
    }

    private static void EnsureKofiWebhookLogIndexes(MongoIndexPlan plan)
    {
        var ttl = new CreateIndexModel<KofiWebhookLogDocument>(
            Builders<KofiWebhookLogDocument>.IndexKeys.Ascending(x => x.ReceivedAt),
            new CreateIndexOptions { Name = "kofi_webhook_log_receivedAt_ttl", ExpireAfter = TimeSpan.FromDays(365) });
        plan.Create("kofi_webhook_log", ttl);
    }
}
