using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class UserNotificationDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("type")]
    public int Type { get; set; }

    [BsonElement("actorHandle")]
    [BsonIgnoreIfNull]
    public string? ActorHandle { get; set; }

    [BsonElement("actorDisplayName")]
    [BsonIgnoreIfNull]
    public string? ActorDisplayName { get; set; }

    [BsonElement("actorAvatarId")]
    [BsonIgnoreIfNull]
    public string? ActorAvatarId { get; set; }

    [BsonElement("eventId")]
    [BsonIgnoreIfNull]
    public string? EventId { get; set; }

    [BsonElement("eventSlug")]
    [BsonIgnoreIfNull]
    public string? EventSlug { get; set; }

    [BsonElement("eventTitle")]
    [BsonIgnoreIfNull]
    public string? EventTitle { get; set; }

    [BsonElement("movieTitle")]
    [BsonIgnoreIfNull]
    public string? MovieTitle { get; set; }

    [BsonElement("isRead")]
    public bool IsRead { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
}
