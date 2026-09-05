using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MigrationHistoryDocument
{
    [BsonId]
    public string MigrationId { get; set; } = string.Empty;

    [BsonElement("appliedAt")]
    public DateTime AppliedAt { get; set; }

    [BsonElement("affectedCount")]
    public long AffectedCount { get; set; }
}
