using System.Globalization;
using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoUsageCountRepository : IUsageCountRepository
{
    public const string CollectionName = "usage_counts";

    private readonly TransactionalCollection<UsageCountDocument> _collection;

    public MongoUsageCountRepository(MongoCollectionFactory collections)
    {
        _collection = collections.GetCollection<UsageCountDocument>(CollectionName);
    }

    public async Task IncrementAsync(DateOnly day, UsageCount count, CancellationToken ct = default)
    {
        var dayText = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var update = Builders<UsageCountDocument>.Update
            .Inc(x => x.Count, 1)
            .SetOnInsert(x => x.Day, dayText)
            .SetOnInsert(x => x.Metric, count.Metric)
            .SetOnInsert(x => x.Variant, count.Variant);

        await _collection.UpdateOneAsync(
            Builders<UsageCountDocument>.Filter.Eq(x => x.Id, $"{dayText}|{count.Metric}|{count.Variant}"),
            update,
            new UpdateOptions { IsUpsert = true },
            ct);
    }
}
