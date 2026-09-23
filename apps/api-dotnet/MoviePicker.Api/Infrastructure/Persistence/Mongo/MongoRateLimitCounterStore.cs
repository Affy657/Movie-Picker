using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoRateLimitCounterStore : IRateLimitCounterStore
{
    private readonly TransactionalCollection<RateLimitCounterDocument> _collection;

    public MongoRateLimitCounterStore(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<RateLimitCounterDocument>("rate_limit_counters");
    }

    public async Task<long> IncrementAsync(string key, DateTimeOffset expiresAt, CancellationToken ct = default)
    {
        var update = Builders<RateLimitCounterDocument>.Update
            .Inc(x => x.Count, 1)
            .SetOnInsert(x => x.ExpiresAt, expiresAt.UtcDateTime);

        var updated = await _collection.FindOneAndUpdateAsync(
            Builders<RateLimitCounterDocument>.Filter.Eq(x => x.Id, key),
            update,
            new FindOneAndUpdateOptions<RateLimitCounterDocument>
            {
                IsUpsert = true,
                ReturnDocument = ReturnDocument.After
            },
            ct);

        return updated?.Count ?? 1;
    }

    public async Task DecrementAsync(string key, CancellationToken ct = default)
    {
        await _collection.UpdateOneAsync(
            Builders<RateLimitCounterDocument>.Filter.And(
                Builders<RateLimitCounterDocument>.Filter.Eq(x => x.Id, key),
                Builders<RateLimitCounterDocument>.Filter.Gt(x => x.Count, 0)),
            Builders<RateLimitCounterDocument>.Update.Inc(x => x.Count, -1),
            cancellationToken: ct);
    }
}
