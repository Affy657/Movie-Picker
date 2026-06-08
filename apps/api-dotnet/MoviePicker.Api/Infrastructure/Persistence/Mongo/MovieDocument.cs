using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class MovieDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("eventId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string EventId { get; set; } = string.Empty;

    [BsonElement("participantId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ParticipantId { get; set; } = string.Empty;

    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    [BsonIgnoreIfDefault]
    public string MediaType { get; set; } = "movie";

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("year")]
    public string Year { get; set; } = string.Empty;

    [BsonElement("posterPath")]
    public string? PosterPath { get; set; }

    [BsonElement("pitchNote")]
    public string? PitchNote { get; set; }

    [BsonElement("genreIds")]
    [BsonIgnoreIfNull]
    public List<int>? GenreIds { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
