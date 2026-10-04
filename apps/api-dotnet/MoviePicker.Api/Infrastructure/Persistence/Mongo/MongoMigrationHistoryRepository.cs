using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoMigrationHistoryRepository : IMigrationHistoryRepository
{
    private readonly TransactionalCollection<MigrationHistoryDocument> _collection;
    private readonly TransactionalCollection<MigrationLeaseDocument> _leases;

    public MongoMigrationHistoryRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<MigrationHistoryDocument>("migrations");
        _leases = collections.GetCollection<MigrationLeaseDocument>("migration_leases");
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

    public async Task<bool> TryAcquireLeaseAsync(
        string migrationId,
        string holder,
        DateTimeOffset now,
        TimeSpan duration,
        CancellationToken ct = default)
    {
        var filter = Builders<MigrationLeaseDocument>.Filter;
        var claimable = filter.Eq(x => x.MigrationId, migrationId)
            & (filter.Lte(x => x.ExpiresAt, now.UtcDateTime) | filter.Eq(x => x.Holder, holder));
        var claim = Builders<MigrationLeaseDocument>.Update
            .Set(x => x.Holder, holder)
            .Set(x => x.ExpiresAt, (now + duration).UtcDateTime);

        try
        {
            await _leases.UpdateOneAsync(claimable, claim, new UpdateOptions { IsUpsert = true }, ct);
            return true;
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return false;
        }
    }

    public Task ReleaseLeaseAsync(string migrationId, string holder, CancellationToken ct = default) =>
        _leases.DeleteOneAsync(x => x.MigrationId == migrationId && x.Holder == holder, ct);
}
