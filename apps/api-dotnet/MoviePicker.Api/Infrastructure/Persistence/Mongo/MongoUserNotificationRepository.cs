using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUserNotificationRepository : IUserNotificationRepository
{
    private readonly TransactionalCollection<UserNotificationDocument> _collection;

    public MongoUserNotificationRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<UserNotificationDocument>("user_notifications");
    }

    public async Task AddAsync(UserNotification notification, CancellationToken ct = default)
    {
        var doc = new UserNotificationDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            UserId = notification.UserId,
            Type = (int)notification.Type,
            ActorHandle = notification.ActorHandle,
            ActorDisplayName = notification.ActorDisplayName,
            ActorAvatarId = notification.ActorAvatarId,
            EventId = notification.EventId,
            EventSlug = notification.EventSlug,
            EventTitle = notification.EventTitle,
            MovieTitle = notification.MovieTitle,
            IsRead = false,
            CreatedAt = notification.CreatedAt.UtcDateTime
        };
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
    }

    public async Task<IReadOnlyList<UserNotification>> ListByUserIdAsync(
        string userId, int limit = 50, int offset = 0, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Skip(offset)
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(d => new UserNotification
        {
            Id = d.Id,
            UserId = d.UserId,
            Type = (UserNotificationType)d.Type,
            ActorHandle = d.ActorHandle,
            ActorDisplayName = d.ActorDisplayName,
            ActorAvatarId = d.ActorAvatarId,
            EventId = d.EventId,
            EventSlug = d.EventSlug,
            EventTitle = d.EventTitle,
            MovieTitle = d.MovieTitle,
            IsRead = d.IsRead,
            CreatedAt = new DateTimeOffset(d.CreatedAt, TimeSpan.Zero)
        });
    }

    public async Task<int> GetUnreadCountAsync(string userId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.UserId == userId && !x.IsRead, cancellationToken: ct);
        return (int)count;
    }

    public async Task MarkAllReadAsync(string userId, CancellationToken ct = default)
    {
        var update = Builders<UserNotificationDocument>.Update.Set(x => x.IsRead, true);
        await _collection.UpdateManyAsync(
            x => x.UserId == userId && !x.IsRead, update, cancellationToken: ct);
    }

    public async Task MarkReadAsync(string userId, string notificationId, CancellationToken ct = default)
    {
        var update = Builders<UserNotificationDocument>.Update.Set(x => x.IsRead, true);
        await _collection.UpdateOneAsync(
            x => x.Id == notificationId && x.UserId == userId, update, cancellationToken: ct);
    }

    public async Task<bool> ExistsAsync(string userId, UserNotificationType type, string eventId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.UserId == userId && x.Type == (int)type && x.EventId == eventId,
            cancellationToken: ct);
        return count > 0;
    }

    public async Task<IReadOnlySet<string>> ListUserIdsByTypeAndEventAsync(UserNotificationType type, string eventId, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.Type == (int)type && x.EventId == eventId)
            .Project(x => x.UserId)
            .ToListAsync(ct);
        return docs.ToHashSet();
    }

    public async Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.UserId == userId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }
}
