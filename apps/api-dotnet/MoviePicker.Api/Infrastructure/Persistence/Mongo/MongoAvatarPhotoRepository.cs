using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAvatarPhotoRepository : IAvatarPhotoRepository
{
    public const string CollectionName = "avatar_photos";

    private readonly TransactionalCollection<AvatarPhotoBlobDocument> _collection;

    public MongoAvatarPhotoRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<AvatarPhotoBlobDocument>(CollectionName);
    }

    public async Task SaveAsync(StoredAvatarPhoto photo, CancellationToken ct = default)
    {
        await _collection.InsertOneAsync(
            new AvatarPhotoBlobDocument
            {
                Key = photo.Key,
                UserId = photo.UserId,
                ContentType = photo.ContentType,
                Data = photo.Data,
                CreatedAt = photo.CreatedAt.UtcDateTime
            },
            cancellationToken: ct);
    }

    public async Task<StoredAvatarPhoto?> GetByKeyAsync(string key, CancellationToken ct = default)
    {
        var doc = await _collection.Find(d => d.Key == key).FirstOrDefaultAsync(ct);
        return doc is null
            ? null
            : new StoredAvatarPhoto
            {
                Key = doc.Key,
                UserId = doc.UserId,
                ContentType = doc.ContentType,
                Data = doc.Data,
                CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero)
            };
    }

    public async Task DeleteAsync(string key, CancellationToken ct = default)
    {
        await _collection.DeleteOneAsync(d => d.Key == key, ct);
    }

    public async Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var result = await _collection.DeleteManyAsync(d => d.UserId == userId, ct);
        return result.IsAcknowledged ? result.DeletedCount : 0;
    }
}

[BsonIgnoreExtraElements]
public sealed class AvatarPhotoBlobDocument
{
    [BsonId]
    public string Key { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("contentType")]
    public string ContentType { get; set; } = string.Empty;

    [BsonElement("data")]
    public byte[] Data { get; set; } = [];

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
}
