using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class VoteDocument : ParticipantScopedDocument
{
    [BsonElement("value")]
    public int Value { get; set; }
}
