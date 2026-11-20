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
            ListId = notification.ListId,
            ListName = notification.ListName,
            GroupId = notification.GroupId,
            GroupName = notification.GroupName,
            IsRead = false,
            IsWithheld = notification.IsWithheld,
            CreatedAt = notification.CreatedAt.UtcDateTime
        };
        await _collection.InsertOneAsync(doc, cancellationToken: ct);
    }

    public async Task<IReadOnlyList<UserNotification>> ListByUserIdAsync(
        string userId, int limit = 50, int offset = 0, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.UserId == userId && !x.IsWithheld)
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
            ListId = d.ListId,
            ListName = d.ListName,
            GroupId = d.GroupId,
            GroupName = d.GroupName,
            IsRead = d.IsRead,
            CreatedAt = new DateTimeOffset(d.CreatedAt, TimeSpan.Zero)
        });
    }

    public async Task<int> GetUnreadCountAsync(string userId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.UserId == userId && !x.IsRead && !x.IsWithheld, cancellationToken: ct);
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
        if (!MongoObjectIds.IsValid(notificationId))
            return;

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

    public async Task<bool> ExistsSinceAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        DateTimeOffset since,
        CancellationToken ct = default)
    {
        var sinceUtc = since.UtcDateTime;
        var count = await _collection.CountDocumentsAsync(
            x => x.UserId == userId && x.Type == (int)type && x.EventId == eventId && x.CreatedAt >= sinceUtc,
            cancellationToken: ct);
        return count > 0;
    }

    public async Task<bool> ExistsFromActorAsync(
        string userId,
        UserNotificationType type,
        string actorHandle,
        CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.UserId == userId && x.Type == (int)type && x.ActorHandle == actorHandle,
            new CountOptions { Limit = 1 },
            ct);
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

    public async Task<long> AnonymizeActorAsync(string actorHandle, string anonymizedName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(actorHandle))
            return 0;
        var res = await _collection.UpdateManyAsync(
            x => x.ActorHandle == actorHandle,
            Builders<UserNotificationDocument>.Update
                .Set(x => x.ActorHandle, null)
                .Set(x => x.ActorDisplayName, anonymizedName)
                .Set(x => x.ActorAvatarId, null),
            cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
    }

    public async Task<long> RenameActorHandleAsync(string previousHandle, string newHandle, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(previousHandle) || string.IsNullOrWhiteSpace(newHandle))
            return 0;
        var res = await _collection.UpdateManyAsync(
            x => x.ActorHandle == previousHandle,
            Builders<UserNotificationDocument>.Update.Set(x => x.ActorHandle, newHandle),
            cancellationToken: ct);
        return res.IsAcknowledged ? res.ModifiedCount : 0;
    }

    public async Task<long> DeleteByEventIdAsync(string eventId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(eventId))
            return 0;
        var res = await _collection.DeleteManyAsync(x => x.EventId == eventId, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> DeleteByListAsync(string listId, string? userId = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(listId))
            return 0;
        var filter = Builders<UserNotificationDocument>.Filter.Eq(x => x.ListId, listId);
        if (userId is not null)
            filter &= Builders<UserNotificationDocument>.Filter.Eq(x => x.UserId, userId);
        var res = await _collection.DeleteManyAsync(filter, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> DeleteByListsAsync(IReadOnlyCollection<string> listIds, CancellationToken ct = default)
    {
        var ids = listIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (ids.Count == 0)
            return 0;
        var res = await _collection.DeleteManyAsync(Builders<UserNotificationDocument>.Filter.In(x => x.ListId, ids), ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }

    public async Task<long> DeleteByGroupAsync(string groupId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(groupId))
            return 0;
        var deleted = await _collection.DeleteManyAsync(Builders<UserNotificationDocument>.Filter.Eq(x => x.GroupId, groupId), ct);
        return deleted.IsAcknowledged ? deleted.DeletedCount : 0;
    }

    public async Task<long> DeleteGroupInvitationAsync(string groupId, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(groupId) || string.IsNullOrWhiteSpace(userId))
            return 0;
        var filter = Builders<UserNotificationDocument>.Filter;
        var doomed = filter.Eq(x => x.GroupId, groupId)
            & filter.Eq(x => x.UserId, userId)
            & filter.Eq(x => x.Type, (int)UserNotificationType.GroupInvitation);
        var deleted = await _collection.DeleteManyAsync(doomed, ct);
        return deleted.IsAcknowledged ? deleted.DeletedCount : 0;
    }

    public async Task<long> DeleteByGroupsAsync(IReadOnlyCollection<string> groupIds, CancellationToken ct = default)
    {
        var known = groupIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct(StringComparer.Ordinal).ToList();
        if (known.Count == 0)
            return 0;
        var deleted = await _collection.DeleteManyAsync(Builders<UserNotificationDocument>.Filter.In(x => x.GroupId, known), ct);
        return deleted.IsAcknowledged ? deleted.DeletedCount : 0;
    }
}
