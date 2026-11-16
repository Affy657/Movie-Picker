using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class WatchedTitleDocument : TitleFactsDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("ownerId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; } = string.Empty;

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
