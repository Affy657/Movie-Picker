using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

/// <summary>Cache d’affiches TMDB (binaire + métadonnées). Collection <c>poster_cache</c>.</summary>
public sealed class PosterCacheDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = "";

    [BsonElement("sourceUrl")]
    public string SourceUrl { get; set; } = "";

    [BsonElement("data")]
    public byte[]? Data { get; set; }

    [BsonElement("contentType")]
    public string? ContentType { get; set; }

    /// <summary>Expiration logique (UTC) : au-delà, refetch TMDB autorisé.</summary>
    [BsonElement("expiresAtUtc")]
    public DateTime ExpiresAtUtc { get; set; }
}
