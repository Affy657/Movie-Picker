using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoPushSubscriptionRepository : IPushSubscriptionRepository
{
    private readonly IMongoCollection<PushSubscriptionDocument> _collection;

    public MongoPushSubscriptionRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<PushSubscriptionDocument>("push_subscriptions");
    }

    public async Task UpsertAsync(PushSubscription subscription, CancellationToken ct = default)
    {
        var filter = Builders<PushSubscriptionDocument>.Filter.And(
            Builders<PushSubscriptionDocument>.Filter.Eq(x => x.UserId, subscription.UserId),
            Builders<PushSubscriptionDocument>.Filter.Eq(x => x.Endpoint, subscription.Endpoint));

        var update = Builders<PushSubscriptionDocument>.Update
            .Set(x => x.P256dh, subscription.P256dh)
            .Set(x => x.Auth, subscription.Auth)
            .SetOnInsert(x => x.UserId, subscription.UserId)
            .SetOnInsert(x => x.Endpoint, subscription.Endpoint)
            .SetOnInsert(x => x.CreatedAt, subscription.CreatedAt.UtcDateTime);

        await _collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
    }

    public async Task DeleteByEndpointAsync(string userId, string endpoint, CancellationToken ct = default)
    {
        var filter = Builders<PushSubscriptionDocument>.Filter.And(
            Builders<PushSubscriptionDocument>.Filter.Eq(x => x.UserId, userId),
            Builders<PushSubscriptionDocument>.Filter.Eq(x => x.Endpoint, endpoint));
        await _collection.DeleteOneAsync(filter, ct);
    }

    public async Task<IReadOnlyList<PushSubscription>> ListByUserIdAsync(string userId, CancellationToken ct = default)
    {
        var docs = await _collection.Find(x => x.UserId == userId).ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public async Task<IReadOnlyList<PushSubscription>> ListByUserIdsAsync(IReadOnlyCollection<string> userIds, CancellationToken ct = default)
    {
        if (userIds.Count == 0)
            return [];
        var filter = Builders<PushSubscriptionDocument>.Filter.In(x => x.UserId, userIds);
        var docs = await _collection.Find(filter).ToListAsync(ct);
        return docs.ConvertAll(ToDomain);
    }

    public async Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.UserId == userId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    private static PushSubscription ToDomain(PushSubscriptionDocument doc) =>
        new()
        {
            Id = doc.Id,
            UserId = doc.UserId,
            Endpoint = doc.Endpoint,
            P256dh = doc.P256dh,
            Auth = doc.Auth,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero)
        };
}
