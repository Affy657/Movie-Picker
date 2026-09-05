using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoMigrationHistoryRepository : IMigrationHistoryRepository
{
    private readonly TransactionalCollection<MigrationHistoryDocument> _collection;

    public MongoMigrationHistoryRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<MigrationHistoryDocument>("migrations");
    }

    public async Task<bool> IsAppliedAsync(string migrationId, CancellationToken ct = default)
    {
        var count = await _collection.CountDocumentsAsync(
            x => x.MigrationId == migrationId,
            new CountOptions { Limit = 1 },
            ct);
        return count > 0;
    }

    public async Task MarkAppliedAsync(
        string migrationId,
        long affectedCount,
        DateTimeOffset appliedAt,
        CancellationToken ct = default)
    {
        var record = Builders<MigrationHistoryDocument>.Update
            .SetOnInsert(x => x.AppliedAt, appliedAt.UtcDateTime)
            .SetOnInsert(x => x.AffectedCount, affectedCount);

        await _collection.UpdateOneAsync(
            x => x.MigrationId == migrationId,
            record,
            new UpdateOptions { IsUpsert = true },
            ct);
    }
}
