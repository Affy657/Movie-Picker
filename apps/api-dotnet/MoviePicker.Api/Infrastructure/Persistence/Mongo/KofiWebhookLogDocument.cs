using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class KofiWebhookLogDocument
{
    [BsonId]
    public string MessageId { get; set; } = string.Empty;

    [BsonElement("receivedAt")]
    public DateTime ReceivedAt { get; set; }
}
