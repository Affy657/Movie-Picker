using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class SavedListDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

    [BsonElement("sourceType")]
    public string SourceType { get; set; } = string.Empty;

    [BsonElement("sourceId")]
    public string SourceId { get; set; } = string.Empty;

    [BsonElement("sourceOwnerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonIgnoreIfNull]
    public string? SourceOwnerId { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("snapshot")]
    [BsonIgnoreIfNull]
    public List<SavedListTitleDocument>? Snapshot { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class SavedListTitleDocument
{
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
}
