using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
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

    [BsonElement("identities")]
    [BsonIgnoreIfNull]
    public List<UserIdentityDocument>? Identities { get; set; }

    [BsonElement("handle")]
    [BsonIgnoreIfNull]
    public string? Handle { get; set; }

    [BsonElement("bio")]
    [BsonIgnoreIfNull]
    public string? Bio { get; set; }

    [BsonElement("isProfilePublic")]
    [BsonIgnoreIfNull]
    public bool? IsProfilePublic { get; set; }

    [BsonElement("uiTheme")]
    public string UiTheme { get; set; } = "system";

    [BsonElement("accentColor")]
    [BsonIgnoreIfNull]
    public string? AccentColor { get; set; }

    [BsonElement("ratingScale")]
    public string RatingScale { get; set; } = "five";

    [BsonElement("avatarId")]
    [BsonIgnoreIfNull]
    public string? AvatarId { get; set; }

    // Anciens champs (pré-refonte notifications) : conservés en lecture seule pour la migration
    // à la volée dans UserDocumentMapper. Ne sont plus jamais écrits (voir NotificationPreferences).
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

    [BsonElement("notifyOnNewFollower")]
    [BsonIgnoreIfNull]
    public bool? NotifyOnNewFollower { get; set; }

    [BsonElement("supporterSince")]
    [BsonIgnoreIfNull]
    public DateTime? SupporterSince { get; set; }

    [BsonElement("letterboxdUsername")]
    [BsonIgnoreIfNull]
    public string? LetterboxdUsername { get; set; }

    [BsonElement("letterboxdLastSyncAt")]
    [BsonIgnoreIfNull]
    public DateTime? LetterboxdLastSyncAt { get; set; }

    [BsonElement("letterboxdLastSyncError")]
    [BsonIgnoreIfNull]
    public string? LetterboxdLastSyncError { get; set; }

    [BsonElement("letterboxdPendingReconciliationCount")]
    [BsonIgnoreIfDefault]
    public int LetterboxdPendingReconciliationCount { get; set; }

    [BsonElement("notificationPreferences")]
    [BsonIgnoreIfNull]
    public List<NotificationPreferenceEntryDocument>? NotificationPreferences { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

public sealed class UserIdentityDocument
{
    [BsonElement("provider")]
    public string Provider { get; set; } = string.Empty;

    [BsonElement("subject")]
    public string Subject { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("linkedAt")]
    public DateTime LinkedAt { get; set; }
}

public sealed class NotificationPreferenceEntryDocument
{
    [BsonElement("type")]
    public int Type { get; set; }

    [BsonElement("enabled")]
    public bool Enabled { get; set; }
}
