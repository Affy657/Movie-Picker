using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MovieRatingDocument : ParticipantScopedDocument
{
    [BsonElement("value")]
    public int Value { get; set; }
}
