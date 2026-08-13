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

    public async Task<bool> TryRecordAsync(
        string messageId, DateTimeOffset receivedAt, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(messageId))
            return false;

        var doc = new KofiWebhookLogDocument
        {
            MessageId = messageId,
            ReceivedAt = receivedAt.UtcDateTime
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
}
