using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class EmailVerificationTokenDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("tokenHash")]
    public string TokenHash { get; set; } = string.Empty;

    [BsonElement("expiresAtUtc")]
    public DateTime ExpiresAtUtc { get; set; }

    [BsonElement("consumedAt")]
    [BsonIgnoreIfNull]
    public DateTime? ConsumedAt { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    public static EmailVerificationTokenDocument From(EmailVerificationToken token) => new()
    {
        Id = string.IsNullOrEmpty(token.Id) ? ObjectId.GenerateNewId().ToString() : token.Id,
        UserId = token.UserId,
        TokenHash = token.TokenHash,
        ExpiresAtUtc = token.ExpiresAtUtc.UtcDateTime,
        ConsumedAt = token.ConsumedAt?.UtcDateTime,
        CreatedAt = token.CreatedAt.UtcDateTime
    };

    public EmailVerificationToken ToDomain() => new()
    {
        Id = Id,
        UserId = UserId,
        TokenHash = TokenHash,
        ExpiresAtUtc = new DateTimeOffset(ExpiresAtUtc, TimeSpan.Zero),
        ConsumedAt = ConsumedAt is { } consumed ? new DateTimeOffset(consumed, TimeSpan.Zero) : null,
        CreatedAt = new DateTimeOffset(CreatedAt, TimeSpan.Zero)
    };
}
