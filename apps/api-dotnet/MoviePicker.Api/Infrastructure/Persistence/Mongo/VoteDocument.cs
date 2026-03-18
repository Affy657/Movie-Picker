using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class VoteDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("eventId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string EventId { get; set; } = string.Empty;

    [BsonElement("movieId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string MovieId { get; set; } = string.Empty;

    [BsonElement("participantId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ParticipantId { get; set; } = string.Empty;

    [BsonElement("value")]
    public int Value { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
