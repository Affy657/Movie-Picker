using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoNotificationDedupRepository : INotificationDedupRepository
{
    private readonly TransactionalCollection<PushDedupMarkerDocument> _collection;

    public MongoNotificationDedupRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<PushDedupMarkerDocument>("push_dedup_markers");
    }

    public async Task<bool> TryClaimAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default)
    {
        var doc = new PushDedupMarkerDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = userId,
            Type = (int)type,
            EventId = eventId,
            Channel = (int)channel,
            CreatedAt = DateTime.UtcNow
        };
        try
        {
            await _collection.InsertOneAsync(doc, cancellationToken: ct);
            return true;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

    public async Task ReleaseAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default)
    {
        await _collection.DeleteOneAsync(Marker(userId, type, eventId, channel), ct);
    }

    public async Task<bool> WasClaimedSinceAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel,
        DateTimeOffset since,
        CancellationToken ct = default)
    {
        var claimedSince = Marker(userId, type, eventId, channel)
            & Builders<PushDedupMarkerDocument>.Filter.Gte(x => x.CreatedAt, since.UtcDateTime);
        return await _collection.CountDocumentsAsync(claimedSince, new CountOptions { Limit = 1 }, ct) > 0;
    }

    private static FilterDefinition<PushDedupMarkerDocument> Marker(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel)
    {
        var filter = Builders<PushDedupMarkerDocument>.Filter;
        var sameChannel = channel == NotificationDedupChannel.Push
            ? filter.Or(filter.Eq(x => x.Channel, (int)channel), filter.Exists(x => x.Channel, false))
            : filter.Eq(x => x.Channel, (int)channel);
        return filter.Eq(x => x.UserId, userId)
            & filter.Eq(x => x.Type, (int)type)
            & filter.Eq(x => x.EventId, eventId)
            & sameChannel;
    }
}
