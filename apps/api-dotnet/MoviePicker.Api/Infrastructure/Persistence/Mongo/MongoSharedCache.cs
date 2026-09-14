using System.Text.Json;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoSharedCache : ISharedCache
{
    public const string CollectionName = "shared_cache";

    private readonly IMongoCollection<SharedCacheDocument> _collection;
    private readonly ILogger<MongoSharedCache> _logger;

    public MongoSharedCache(MongoCollectionFactory collections, ILogger<MongoSharedCache> logger)
    {
        _collection = collections.GetCollectionOutsideTransactions<SharedCacheDocument>(CollectionName);
        _logger = logger;
    }

    public async Task<SharedCacheEntry<T>?> TryGetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var document = await _collection
                .Find(entry => entry.Id == key)
                .FirstOrDefaultAsync(ct)
                .ConfigureAwait(false);
            if (document is null || document.ExpiresAt <= DateTime.UtcNow)
                return null;

            var value = JsonSerializer.Deserialize<T>(document.Payload);
            return value is null
                ? null
                : new SharedCacheEntry<T>(value, new DateTimeOffset(document.ExpiresAt, TimeSpan.Zero));
        }
        catch (Exception ex) when (ex is MongoException or TimeoutException or JsonException)
        {
            _logger.LogWarning(ex, "Cache partagé illisible pour {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        var document = new SharedCacheDocument
        {
            Id = key,
            Payload = JsonSerializer.Serialize(value),
            ExpiresAt = DateTime.UtcNow.Add(ttl),
        };
        try
        {
            await _collection
                .ReplaceOneAsync(entry => entry.Id == key, document, new ReplaceOptions { IsUpsert = true }, ct)
                .ConfigureAwait(false);
        }
        catch (Exception ex) when (ex is MongoException or TimeoutException)
        {
            _logger.LogWarning(ex, "Cache partagé non écrit pour {Key}", key);
        }
    }
}
