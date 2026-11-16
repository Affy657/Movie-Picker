using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class WatchedTitleDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = MovieMapper.StoredMovieMediaType;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("year")]
    public string Year { get; set; } = string.Empty;

    [BsonElement("posterPath")]
    [BsonIgnoreIfNull]
    public string? PosterPath { get; set; }

    [BsonElement("voteAverage")]
    [BsonIgnoreIfNull]
    public double? VoteAverage { get; set; }

    [BsonElement("runtimeMinutes")]
    [BsonIgnoreIfNull]
    public int? RuntimeMinutes { get; set; }

    [BsonElement("genreIds")]
    [BsonIgnoreIfNull]
    public List<int>? GenreIds { get; set; }

    [BsonElement("watchedAt")]
    public DateTime WatchedAt { get; set; }

    [BsonElement("rating")]
    [BsonIgnoreIfNull]
    public int? Rating { get; set; }

    [BsonElement("ratingOrigin")]
    [BsonIgnoreIfNull]
    public string? RatingOrigin { get; set; }

    [BsonElement("origin")]
    [BsonIgnoreIfNull]
    public string? Origin { get; set; }

    [BsonElement("letterboxdSlug")]
    [BsonIgnoreIfNull]
    public string? LetterboxdSlug { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
