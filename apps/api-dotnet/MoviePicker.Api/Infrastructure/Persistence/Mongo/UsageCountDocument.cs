using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class UsageCountDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;

    [BsonElement("day")]
    public string Day { get; set; } = string.Empty;

    [BsonElement("metric")]
    public string Metric { get; set; } = string.Empty;

    [BsonElement("variant")]
    public string Variant { get; set; } = string.Empty;

    [BsonElement("count")]
    public long Count { get; set; }
}
