using MongoDB.Bson;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoFollowRepository : IFollowRepository
{
    private readonly IMongoCollection<FollowDocument> _collection;

    public MongoFollowRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<FollowDocument>("follows");
    }

    public async Task<bool> FollowAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        var doc = new FollowDocument
        {
            Id = ObjectId.GenerateNewId().ToString(),
            FollowerId = followerId,
            FolloweeId = followeeId,
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

    public async Task UnfollowAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        await _collection.DeleteOneAsync(
            x => x.FollowerId == followerId && x.FolloweeId == followeeId, ct);
    }

    public async Task<bool> IsFollowingAsync(string followerId, string followeeId, CancellationToken ct = default)
    {
        return await _collection
            .Find(x => x.FollowerId == followerId && x.FolloweeId == followeeId)
            .AnyAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetFollowingIdsAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.FollowerId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(d => d.FolloweeId);
    }

    public async Task<IReadOnlyList<string>> GetFollowerIdsAsync(string userId, int limit = 500, CancellationToken ct = default)
    {
        var docs = await _collection
            .Find(x => x.FolloweeId == userId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync(ct);
        return docs.ConvertAll(d => d.FollowerId);
    }

    public async Task<(int Following, int Followers)> GetCountsAsync(string userId, CancellationToken ct = default)
    {
        var followingTask = _collection.CountDocumentsAsync(x => x.FollowerId == userId, cancellationToken: ct);
        var followersTask = _collection.CountDocumentsAsync(x => x.FolloweeId == userId, cancellationToken: ct);
        await Task.WhenAll(followingTask, followersTask);
        return ((int)followingTask.Result, (int)followersTask.Result);
    }

    public async Task<long> DeleteAllForUserAsync(string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return 0;
        var filter = Builders<FollowDocument>.Filter.Or(
            Builders<FollowDocument>.Filter.Eq(x => x.FollowerId, userId),
            Builders<FollowDocument>.Filter.Eq(x => x.FolloweeId, userId));
        var res = await _collection.DeleteManyAsync(filter, ct);
        return res.IsAcknowledged ? res.DeletedCount : 0;
    }
}
