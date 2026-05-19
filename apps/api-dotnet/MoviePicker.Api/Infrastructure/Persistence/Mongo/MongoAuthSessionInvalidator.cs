using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoAuthSessionInvalidator : IAuthSessionInvalidator
{
    private readonly IMongoCollection<AuthSessionDocument> _collection;

    public MongoAuthSessionInvalidator(IMongoDatabase database)
    {
        _collection = database.GetCollection<AuthSessionDocument>("auth_sessions");
    }

    public async Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;

        var result = await _collection.DeleteManyAsync(d => d.UserId == userId, ct);
        return result.DeletedCount;
    }
}
