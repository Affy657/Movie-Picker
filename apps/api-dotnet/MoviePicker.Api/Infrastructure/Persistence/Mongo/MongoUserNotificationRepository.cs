using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUserNotificationRepository : IUserNotificationRepository
{
    private readonly IMongoCollection<UserNotificationDocument> _collection;

    public MongoUserNotificationRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<UserNotificationDocument>("user_notifications");
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
            IsRead = false,
            CreatedAt = notification.CreatedAt.UtcDateTime
        };
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
    }

    public async Task<IReadOnlyList<UserNotification>> ListByUserIdAsync(
        string userId, int limit = 50, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.UserId == userId)
            .SortByDescending(x => x.CreatedAt)
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
}
