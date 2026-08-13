using MongoDB.Driver;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MongoKofiWebhookLogRepository : IKofiWebhookLogRepository
{
    private readonly IMongoCollection<KofiWebhookLogDocument> _collection;

    public MongoKofiWebhookLogRepository(IMongoDatabase database)
    {
        _collection = database.GetCollection<KofiWebhookLogDocument>("kofi_webhook_log");
    }

    public async Task<bool> HasProcessedAsync(string messageId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            return false;

        var count = await _collection.CountDocumentsAsync(
            x => x.MessageId == messageId,
            new CountOptions { Limit = 1 },
            ct);
        return count > 0;
    }

    public async Task RecordAsync(
        string messageId, DateTimeOffset receivedAt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            return;

        var keepEarliestDelivery = Builders<KofiWebhookLogDocument>.Update
            .SetOnInsert(x => x.ReceivedAt, receivedAt.UtcDateTime);

        await _collection.UpdateOneAsync(
            x => x.MessageId == messageId,
            keepEarliestDelivery,
            new UpdateOptions { IsUpsert = true },
            ct);
    }
}
