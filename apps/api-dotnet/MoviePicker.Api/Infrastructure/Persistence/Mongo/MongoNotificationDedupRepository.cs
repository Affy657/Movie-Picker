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
}
