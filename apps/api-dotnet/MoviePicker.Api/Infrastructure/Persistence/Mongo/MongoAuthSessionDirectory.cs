using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAuthSessionDirectory : IAuthSessionDirectory
{
    private readonly TransactionalCollection<AuthSessionDocument> _collection;
    private readonly AuthTicketCache _ticketCache;

    public MongoAuthSessionDirectory(MongoCollectionFactory collections, AuthTicketCache ticketCache)
    {
        _collection = collections.GetCollection<AuthSessionDocument>("auth_sessions");
        _ticketCache = ticketCache;
    }

    public async Task<IReadOnlyList<StoredAuthSession>> ListActiveForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return [];

        var now = DateTimeOffset.UtcNow;
        var docs = await _collection.Find(d => d.UserId == userId).ToListAsync(ct);
        return docs
            .Where(d => !SessionWindow.IsExpired(AsUtc(d.CreatedAtUtc), AsUtc(d.ExpiresAtUtc), now))
            .Select(ToStored)
            .ToList();
    }

    public async Task<bool> RevokeForUserAsync(string userId, string sessionKey, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId) || string.IsNullOrWhiteSpace(sessionKey))
            return false;

        var result = await _collection.DeleteOneAsync(d => d.Id == sessionKey && d.UserId == userId, ct);
        if (result.DeletedCount == 0)
            return false;
        _ticketCache.Remove(sessionKey);
        return true;
    }

    private static StoredAuthSession ToStored(AuthSessionDocument doc) =>
        new(
            doc.Id,
            doc.UserAgent,
            AsUtc(doc.CreatedAtUtc),
            doc.LastSeenAtUtc is { } lastSeen ? AsUtc(lastSeen) : null);

    private static DateTimeOffset AsUtc(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
