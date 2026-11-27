using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoKnownDeviceRepository : IKnownDeviceRepository
{
    public const string CollectionName = "known_devices";

    private readonly TransactionalCollection<KnownDeviceDocument> _collection;

    public MongoKnownDeviceRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<KnownDeviceDocument>(CollectionName);
    }

    public async Task<KnownDevice?> FindAsync(string userId, string tokenHash, DateTimeOffset now, CancellationToken ct = default)
    {
        var cutoff = now.UtcDateTime;
        var doc = await _collection
            .Find(d => d.UserId == userId && d.TokenHash == tokenHash && d.ExpiresAtUtc > cutoff)
            .FirstOrDefaultAsync(ct);
        return doc?.ToDomain();
    }

    public async Task<bool> AnyForUserAsync(string userId, DateTimeOffset now, CancellationToken ct = default)
    {
        var cutoff = now.UtcDateTime;
        return await _collection.Find(d => d.UserId == userId && d.ExpiresAtUtc > cutoff).Limit(1).AnyAsync(ct);
    }

    public async Task<KnownDevice?> TryAddAsync(KnownDevice device, CancellationToken ct = default)
    {
        var doc = KnownDeviceDocument.From(device);
        var cutoff = device.FirstSeenAt.UtcDateTime;
        await _collection.DeleteManyAsync(
            d => d.UserId == doc.UserId && d.TokenHash == doc.TokenHash && d.ExpiresAtUtc <= cutoff,
            ct);
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return null;
        }
        return doc.ToDomain();
    }

    public async Task MarkSeenAsync(string deviceId, DateTimeOffset seenAt, CancellationToken ct = default)
    {
        await _collection.UpdateOneAsync(
            d => d.Id == deviceId,
            Builders<KnownDeviceDocument>.Update
                .Set(d => d.LastSeenAtUtc, seenAt.UtcDateTime)
                .Set(d => d.ExpiresAtUtc, (seenAt + KnownDevice.Retention).UtcDateTime),
            cancellationToken: ct);
    }

    public async Task<IReadOnlyList<KnownDevice>> ListByUserIdAsync(string userId, CancellationToken ct = default)
    {
        var docs = await _collection.Find(d => d.UserId == userId).SortBy(d => d.FirstSeenAtUtc).ToListAsync(ct);
        return docs.Select(d => d.ToDomain()).ToList();
    }

    public async Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var result = await _collection.DeleteManyAsync(d => d.UserId == userId, ct);
        return result.IsAcknowledged ? result.DeletedCount : 0;
    }
}
