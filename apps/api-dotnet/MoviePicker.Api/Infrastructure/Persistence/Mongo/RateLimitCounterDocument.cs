using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class RateLimitCounterDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;

    [BsonElement("count")]
    public long Count { get; set; }

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }
}
