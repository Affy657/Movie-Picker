using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
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
    private const double ThreeDays = 3 * 24 * 60 * 60;
    private const double OneYear = 365 * 24 * 60 * 60;

    private static readonly ExpectedIndex[] Expected =
    [
        new("users", "users_email_unique", Unique: true),
        new("users", "users_handle_unique", Unique: true),
        new("users", "users_updatedAt"),
        new("users", "users_identities_provider_subject_unique", Unique: true),

        new("events", "events_slug_unique", Unique: true),
        new("events", "events_creatorUserId"),

        new("movies", "movies_eventId"),
        new("movies", "movies_eventId_tmdbId_unique", Unique: true),

        new("votes", "votes_movieId"),
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

        new("seen_marks", "seen_marks_event_movie_participant_unique", Unique: true),
        new("seen_marks", "seen_marks_movieId"),

        new("push_subscriptions", "push_subscriptions_userId_endpoint_unique", Unique: true),
        new("push_subscriptions", "push_subscriptions_userId"),

        new("follows", "follows_followerId_followeeId_unique", Unique: true),
        new("follows", "follows_followerId_createdAt"),
        new("follows", "follows_followeeId_createdAt"),

        new("watchlist", "watchlist_userId_tmdbId_mediaType_unique", Unique: true),
        new("watchlist", "watchlist_userId_createdAt"),
        new("watchlist", "watchlist_runtimeMinutes_missing"),

        new("user_notifications", "user_notifications_userId_createdAt"),
        new("user_notifications", "user_notifications_userId_isRead"),
        new("user_notifications", "user_notifications_eventId"),
        new("user_notifications", "user_notifications_createdAt_ttl", ExpireAfterSeconds: NinetyDays),

        new("push_dedup_markers", "push_dedup_markers_channel_unique", Unique: true),
        new("push_dedup_markers", "push_dedup_markers_createdAt_ttl", ExpireAfterSeconds: ThreeDays),

        new("rate_limit_counters", "rate_limit_counters_expiresAt_ttl", ExpireAfterSeconds: 0),

        new("kofi_webhook_log", "kofi_webhook_log_receivedAt_ttl", ExpireAfterSeconds: OneYear)
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
        var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
        using var cursor = await database.GetCollection<BsonDocument>(collection).Indexes.ListAsync();
        var indexes = await cursor.ToListAsync();
        return indexes
            .Where(index => index["name"].AsString != "_id_")
            .ToDictionary(index => index["name"].AsString, index => index);
    }

    [MongoFact]
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

    [MongoFact]
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

    [MongoFact]
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
