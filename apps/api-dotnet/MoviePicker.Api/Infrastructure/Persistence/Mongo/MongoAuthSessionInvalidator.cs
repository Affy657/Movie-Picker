using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAuthSessionInvalidator : IAuthSessionInvalidator
{
    private readonly TransactionalCollection<AuthSessionDocument> _collection;

    public MongoAuthSessionInvalidator(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<AuthSessionDocument>("auth_sessions");
    }

    public async Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        var result = await _collection.DeleteManyAsync(d => d.UserId == userId, ct);
        return result.DeletedCount;
    }
}
