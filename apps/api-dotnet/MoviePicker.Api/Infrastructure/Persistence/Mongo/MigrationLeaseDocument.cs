using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MigrationLeaseDocument
{
    [BsonId]
    public string MigrationId { get; set; } = string.Empty;

    [BsonElement("holder")]
    public string Holder { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }
}
