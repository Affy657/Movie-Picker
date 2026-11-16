using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public abstract class TitleFactsDocument
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
