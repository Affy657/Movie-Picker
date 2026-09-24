using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Infrastructure.Web;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAuthSessionInvalidator : IAuthSessionInvalidator
{
    private readonly TransactionalCollection<AuthSessionDocument> _collection;
    private readonly AuthTicketCache _ticketCache;

    public MongoAuthSessionInvalidator(MongoCollectionFactory collections, AuthTicketCache ticketCache)
    {
        _collection = collections.GetCollection<AuthSessionDocument>("auth_sessions");
        _ticketCache = ticketCache;
    }

    public async Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        var result = await _collection.DeleteManyAsync(d => d.UserId == userId, ct);
        _ticketCache.InvalidateUser(userId);
        return result.DeletedCount;
    }

    public async Task<long> InvalidateOthersForUserAsync(string userId, string? keptSessionId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        var result = await _collection.DeleteManyAsync(d => d.UserId == userId && d.Id != keptSessionId, ct);
        _ticketCache.InvalidateUser(userId);
        return result.DeletedCount;
    }
}
