using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class PosterCacheDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = "";

    [BsonElement("sourceUrl")]
    public string SourceUrl { get; set; } = "";

    [BsonElement("data")]
    public byte[]? Data { get; set; }

    [BsonElement("contentType")]
    public string? ContentType { get; set; }

    [BsonElement("expiresAtUtc")]
    public DateTime ExpiresAtUtc { get; set; }
}
