using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class WatchlistItemDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = "movie";

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("year")]
    public string Year { get; set; } = string.Empty;

    [BsonElement("posterPath")]
    public string? PosterPath { get; set; }

    [BsonElement("voteAverage")]
    [BsonIgnoreIfNull]
    public double? VoteAverage { get; set; }

    [BsonElement("runtimeMinutes")]
    [BsonIgnoreIfNull]
    public int? RuntimeMinutes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
}
