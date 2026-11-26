using System.Globalization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Persistence.Mongo;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MongoIndexInventoryTests : IClassFixture<MoviePickerApplicationFactory>
{
    private sealed record ExpectedIndex(
        string Collection,
        string Name,
        bool Unique = false,
        double? ExpireAfterSeconds = null);

    private const double NinetyDays = 90 * 24 * 60 * 60;
    private const double EightDays = 8 * 24 * 60 * 60;
    private const double OneYear = 365 * 24 * 60 * 60;

    private static readonly ExpectedIndex[] Expected =
    [
        new("users", "users_email_unique", Unique: true),
        new("users", "users_handle_unique", Unique: true),
        new("users", "users_updatedAt"),
        new("users", "users_identities_provider_subject_unique", Unique: true),

        new("events", "events_slug_unique", Unique: true),
        new("events", "events_recapSlug_unique", Unique: true),
        new("events", "events_creatorUserId"),
        new("events", "events_recurrence_creatorUserId"),
        new("events", "events_groupId_startAtUtc"),
        new("events", "events_startAtUtc"),
        new("events", "events_winners_pickedAt"),
        new("events", "events_creator_creationRequest_unique", Unique: true),
        new("events", "events_removedUserIds"),
        new("events", "events_coHostUserIds"),

        new("movies", "movies_participantId"),
        new("movies", "movies_eventId_tmdbId_mediaType_unique", Unique: true),

        new("votes", "votes_movieId"),
        new("votes", "votes_participantId"),
        new("votes", "votes_event_movie_participant_unique", Unique: true),

        new("participants", "participants_eventId_userId_unique", Unique: true),
        new("participants", "participants_userId"),
        new("participants", "participants_eventId_pseudo_unique", Unique: true),
        new("participants", "participants_eventId_createdAt"),

        new("auth_sessions", "auth_sessions_expires_ttl", ExpireAfterSeconds: 0),
        new("auth_sessions", "auth_sessions_userId"),

        new("password_reset_tokens", "password_reset_tokens_tokenHash_unique", Unique: true),
        new("password_reset_tokens", "password_reset_tokens_userId"),
        new("password_reset_tokens", "password_reset_tokens_expires_ttl", ExpireAfterSeconds: 0),
        new("email_verification_tokens", "email_verification_tokens_tokenHash_unique", Unique: true),
        new("email_verification_tokens", "email_verification_tokens_userId"),
        new("email_verification_tokens", "email_verification_tokens_expires_ttl", ExpireAfterSeconds: 0),

        new("seen_marks", "seen_marks_event_movie_participant_unique", Unique: true),
        new("movie_ratings", "movie_ratings_event_movie_participant_unique", Unique: true),
        new("movie_ratings", "movie_ratings_participantId"),
        new("seen_marks", "seen_marks_participantId"),

        new("push_subscriptions", "push_subscriptions_userId_endpoint_unique", Unique: true),
        new("push_subscriptions", "push_subscriptions_endpoint"),

        new("follows", "follows_followerId_followeeId_unique", Unique: true),
        new("follows", "follows_followerId_createdAt"),
        new("follows", "follows_followeeId_createdAt"),

        new("watchlist", "watchlist_userId_tmdbId_mediaType_unique", Unique: true),
        new("watchlist", "watchlist_userId_createdAt"),

        new("movie_lists", "movie_lists_ownerId_normalizedName_unique", Unique: true),
        new("movie_lists", "movie_lists_members_userId"),
        new("movie_lists", "movie_lists_invitations_userId"),
        new("movie_lists", "movie_lists_inviteLink_token_unique", Unique: true),

        new("friend_groups", "friend_groups_ownerId"),
        new("friend_groups", "friend_groups_members_userId"),
        new("friend_groups", "friend_groups_invitations_userId"),
        new("friend_groups", "friend_groups_inviteLink_token_unique", Unique: true),

        new("watched_titles", "watched_titles_ownerId_tmdbId_mediaType_unique", Unique: true),

        new("saved_lists", "saved_lists_ownerId_sourceType_sourceId_unique", Unique: true),
        new("saved_lists", "saved_lists_sourceOwnerId"),

        new("user_notifications", "user_notifications_userId_createdAt"),
        new("user_notifications", "user_notifications_userId_isRead"),
        new("user_notifications", "user_notifications_eventId"),
        new("user_notifications", "user_notifications_actorHandle"),
        new("user_notifications", "user_notifications_listId"),
        new("user_notifications", "user_notifications_groupId"),
        new("user_notifications", "user_notifications_createdAt_ttl", ExpireAfterSeconds: NinetyDays),

        new("push_dedup_markers", "push_dedup_markers_channel_unique", Unique: true),
        new("push_dedup_markers", "push_dedup_markers_createdAt_ttl_8d", ExpireAfterSeconds: EightDays),

        new("rate_limit_counters", "rate_limit_counters_expiresAt_ttl", ExpireAfterSeconds: 0),

        new("shared_cache", "shared_cache_expiresAt_ttl", ExpireAfterSeconds: 0),

        new("poster_cache", "poster_cache_expiresAtUtc_ttl", ExpireAfterSeconds: 0),

        new("avatar_photos", "avatar_photos_userId"),
        new("avatar_photos", "avatar_photos_expiresAt_ttl", ExpireAfterSeconds: 0),
        new("banner_photos", "banner_photos_userId"),
        new("banner_photos", "banner_photos_expiresAt_ttl", ExpireAfterSeconds: 0),

        new("event_presence", "event_presence_eventId_participantId"),
        new("event_presence", "event_presence_expiresAt_ttl", ExpireAfterSeconds: 0),

        new("kofi_webhook_log", "kofi_webhook_log_receivedAt_ttl", ExpireAfterSeconds: OneYear)
    ];

    private static readonly (string Collection, string Name, string Field)[] RetiredIndexes =
    [
        ("events", "events_winners_movieId", "winners.movieId"),
        ("events", "events_groupId", "groupId"),
        ("movies", "movies_eventId", "eventId"),
        ("seen_marks", "seen_marks_movieId", "movieId"),
        ("push_subscriptions", "push_subscriptions_userId", "userId"),
        ("watchlist", "watchlist_runtimeMinutes_missing", "runtimeMinutes")
    ];

    private readonly MoviePickerApplicationFactory _factory;

    public MongoIndexInventoryTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private async Task<Dictionary<string, BsonDocument>> ListIndexesAsync(string collection)
    {
        using var scope = _factory.Services.CreateScope();
        return await ListIndexesAsync(scope.ServiceProvider.GetRequiredService<IMongoDatabase>(), collection);
    }

    private static async Task<Dictionary<string, BsonDocument>> ListIndexesAsync(IMongoDatabase database, string collection)
    {
        using var cursor = await database.GetCollection<BsonDocument>(collection).Indexes.ListAsync();
        var indexes = await cursor.ToListAsync();
        return indexes
            .Where(index => index["name"].AsString != "_id_")
            .ToDictionary(index => index["name"].AsString, index => index);
    }

    [Fact]
    public void IndexPlan_DeclaresExactlyTheInventory_SoANewCollectionCannotEscapeIt()
    {
        using var unusedClient = new MongoClient("mongodb://127.0.0.1:27017");
        var plan = MongoIndexInitializer.BuildPlan(unusedClient.GetDatabase("index_plan_only"));

        var declared = plan.Descriptions
            .Where(description => !description.StartsWith("drop ", StringComparison.Ordinal))
            .Select(description => description.Split('|'))
            .Select(parts => string.Join('|', parts[0], parts[1], parts[3], parts[5]))
            .Order(StringComparer.Ordinal)
            .ToArray();
        var expected = Expected
            .Select(index => string.Join(
                '|',
                index.Collection,
                index.Name,
                index.Unique ? "unique" : string.Empty,
                index.ExpireAfterSeconds?.ToString(CultureInfo.InvariantCulture) ?? string.Empty))
            .Order(StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(expected, declared);
    }

    [Fact]
    public async Task EveryCollection_CarriesExactlyTheDeclaredIndexes()
    {
        foreach (var group in Expected.GroupBy(index => index.Collection))
        {
            var found = (await ListIndexesAsync(group.Key)).Keys
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();
            var expected = group
                .Select(index => index.Name)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray();

            Assert.Equal(expected, found);
        }
    }

    [Fact]
    public async Task Startup_RecordsTheIndexSpecificationMarker_SoTheNextStartSkipsCreation()
    {
        using var scope = _factory.Services.CreateScope();
        var initializer = scope.ServiceProvider.GetServices<IHostedService>().OfType<MongoIndexInitializer>().Single();
        var history = scope.ServiceProvider.GetRequiredService<IMigrationHistoryRepository>();

        Assert.StartsWith(MongoIndexPlan.MarkerPrefix, initializer.MarkerId);
        Assert.True(await history.IsAppliedAsync(initializer.MarkerId));
    }

    [Fact]
    public async Task DropIfExists_DropsThePresentIndex_AndSkipsTheMissingOne()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var collection = "index_plan_scratch_" + ObjectId.GenerateNewId();
        var indexes = database.GetCollection<BsonDocument>(collection).Indexes;
        await indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(
            Builders<BsonDocument>.IndexKeys.Ascending("legacy"),
            new CreateIndexOptions { Name = "scratch_legacy" }));
        try
        {
            var plan = new MongoIndexPlan(database);
            plan.DropIfExists<BsonDocument>(collection, "scratch_legacy");

            await plan.ExecuteAsync(CancellationToken.None);
            Assert.DoesNotContain("scratch_legacy", (await ListIndexesAsync(collection)).Keys);

            await plan.ExecuteAsync(CancellationToken.None);
            Assert.DoesNotContain("scratch_legacy", (await ListIndexesAsync(collection)).Keys);
        }
        finally
        {
            await database.DropCollectionAsync(collection);
        }
    }

    [Fact]
    public async Task Plan_OnADatabaseStillCarryingTheRetiredIndexes_DropsThem_AndCanRunAgain()
    {
        using var scope = _factory.Services.CreateScope();
        var client = scope.ServiceProvider.GetRequiredService<IMongoClient>();
        var databaseName = "moviepicker_it_index_upgrade_" + Guid.NewGuid().ToString("N");
        var database = client.GetDatabase(databaseName);
        try
        {
            foreach (var (collection, name, field) in RetiredIndexes)
            {
                await database.GetCollection<BsonDocument>(collection).Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(
                    Builders<BsonDocument>.IndexKeys.Ascending(field),
                    new CreateIndexOptions { Name = name }));
            }

            var plan = MongoIndexInitializer.BuildPlan(database);
            await plan.ExecuteAsync(CancellationToken.None);
            await plan.ExecuteAsync(CancellationToken.None);

            foreach (var (collection, name, _) in RetiredIndexes)
                Assert.DoesNotContain(name, (await ListIndexesAsync(database, collection)).Keys);
            Assert.Contains("push_subscriptions_endpoint", (await ListIndexesAsync(database, "push_subscriptions")).Keys);
        }
        finally
        {
            await client.DropDatabaseAsync(databaseName);
        }
    }

    [Fact]
    public async Task QueriesOfTheRetiredIndexes_StayOnAnIndex()
    {
        var id = ObjectId.GenerateNewId();

        Assert.Contains(
            "movies_eventId_tmdbId_mediaType_unique",
            await WinningPlanAsync("movies", new BsonDocument("eventId", id)));
        Assert.Contains(
            "seen_marks_event_movie_participant_unique",
            await WinningPlanAsync("seen_marks", new BsonDocument { { "eventId", id }, { "movieId", id } }));
        Assert.Contains(
            "push_subscriptions_userId_endpoint_unique",
            await WinningPlanAsync("push_subscriptions", new BsonDocument("userId", id)));
        Assert.Contains(
            "events_groupId_startAtUtc",
            await WinningPlanAsync("events", new BsonDocument("groupId", new BsonDocument("$in", new BsonArray { id }))));
    }

    [Fact]
    public async Task OpenGroupNights_SkipTheNightsLongOverThroughTheGroupAndStartIndex()
    {
        var openNights = new BsonDocument
        {
            { "groupId", new BsonDocument("$in", new BsonArray { ObjectId.GenerateNewId() }) },
            { "closedAt", BsonNull.Value },
            {
                "$or",
                new BsonArray
                {
                    new BsonDocument("startAtUtc", new BsonDocument("$gte", new DateTime(2026, 9, 8, 0, 0, 0, DateTimeKind.Utc))),
                    new BsonDocument("startAtUtc", BsonNull.Value)
                }
            }
        };

        var plan = await WinningPlanAsync("events", openNights);

        Assert.Contains("events_groupId_startAtUtc", plan);
        Assert.DoesNotContain("COLLSCAN", plan);
    }

    [Fact]
    public async Task PushSubscriptionHandover_FindsTheEndpointThroughItsIndex()
    {
        var otherOwners = new BsonDocument { { "endpoint", "https://push.test/a" }, { "userId", new BsonDocument("$ne", ObjectId.GenerateNewId()) } };

        Assert.Contains("push_subscriptions_endpoint", await WinningPlanAsync("push_subscriptions", otherOwners));
    }

    [Fact]
    public async Task ForgettingARemovedUser_FindsTheNightsThroughTheirIndex()
    {
        var removedUser = new BsonDocument("removedUserIds", ObjectId.GenerateNewId().ToString());

        Assert.Contains("events_removedUserIds", await WinningPlanAsync("events", removedUser));
    }

    [Fact]
    public async Task ForgettingACoHost_FindsTheNightsThroughTheirIndex()
    {
        var userId = ObjectId.GenerateNewId().ToString();
        var forgotten = new BsonDocument("$or", new BsonArray
        {
            new BsonDocument("removedUserIds", userId),
            new BsonDocument("coHostUserIds", userId)
        });

        var plan = await WinningPlanAsync("events", forgotten);

        Assert.Contains("events_removedUserIds", plan);
        Assert.Contains("events_coHostUserIds", plan);
        Assert.DoesNotContain("COLLSCAN", plan);
    }

    [Fact]
    public async Task RatingReminderPass_FindsTheNightsThroughTheStartAndPickIndexes()
    {
        var since = new BsonDateTime(DateTime.UtcNow.AddDays(-7));
        var endedOrDrawnLately = new BsonDocument("$or", new BsonArray
        {
            new BsonDocument("startAtUtc", new BsonDocument("$gt", since)),
            new BsonDocument("winners", new BsonDocument("$elemMatch", new BsonDocument("pickedAt", new BsonDocument("$gt", since))))
        });

        var plan = await WinningPlanAsync("events", endedOrDrawnLately);

        Assert.Contains("events_startAtUtc", plan);
        Assert.Contains("events_winners_pickedAt", plan);
        Assert.DoesNotContain("COLLSCAN", plan);
    }

    private async Task<string> WinningPlanAsync(string collection, BsonDocument filter)
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        var explained = await database.RunCommandAsync<BsonDocument>(new BsonDocument
        {
            { "explain", new BsonDocument { { "find", collection }, { "filter", filter } } },
            { "verbosity", "queryPlanner" }
        });
        return explained["queryPlanner"]["winningPlan"].ToJson();
    }

    [Fact]
    public async Task UniqueIndexes_AreDeclaredUnique()
    {
        foreach (var group in Expected.GroupBy(index => index.Collection))
        {
            var found = await ListIndexesAsync(group.Key);
            foreach (var expected in group)
            {
                var declaredUnique = found[expected.Name].GetValue("unique", BsonBoolean.False).AsBoolean;
                Assert.Equal(expected.Unique, declaredUnique);
            }
        }
    }

    [Fact]
    public async Task ExpiringIndexes_CarryTheirRetention()
    {
        foreach (var group in Expected.GroupBy(index => index.Collection))
        {
            var found = await ListIndexesAsync(group.Key);
            foreach (var expected in group)
            {
                var index = found[expected.Name];
                if (expected.ExpireAfterSeconds is null)
                {
                    Assert.False(index.Contains("expireAfterSeconds"), expected.Name);
                    continue;
                }

                Assert.True(index.Contains("expireAfterSeconds"), expected.Name);
                Assert.Equal(expected.ExpireAfterSeconds.Value, index["expireAfterSeconds"].ToDouble());
            }
        }
    }
}
