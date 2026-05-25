using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public sealed class UserDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("passwordHash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string DisplayName { get; set; } = string.Empty;

    [BsonElement("uiTheme")]
    public string UiTheme { get; set; } = "system";

    [BsonElement("accentColor")]
    [BsonIgnoreIfNull]
    public string? AccentColor { get; set; }

    [BsonElement("notifyOnParticipantJoined")]
    [BsonIgnoreIfNull]
    public bool? NotifyOnParticipantJoined { get; set; }

    [BsonElement("notifyEventReminder")]
    [BsonIgnoreIfNull]
    public bool? NotifyEventReminder { get; set; }

    [BsonElement("notifyOnMovieAdded")]
    [BsonIgnoreIfNull]
    public bool? NotifyOnMovieAdded { get; set; }

    [BsonElement("notifyOnMoviePicked")]
    [BsonIgnoreIfNull]
    public bool? NotifyOnMoviePicked { get; set; }

    [BsonElement("notifyOnEventDeleted")]
    [BsonIgnoreIfNull]
    public bool? NotifyOnEventDeleted { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
