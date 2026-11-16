using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class EventPresenceDocument
{
    [BsonId]
    public string Id { get; set; } = string.Empty;

    [BsonElement("eventId")]
    public string EventId { get; set; } = string.Empty;

    [BsonElement("participantId")]
    public string ParticipantId { get; set; } = string.Empty;

    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    [BsonElement("proposingUntil")]
    [BsonIgnoreIfNull]
    public DateTime? ProposingUntil { get; set; }
}
