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

    [BsonElement("unlinkedIdentities")]
    [BsonIgnoreIfNull]
    public List<UnlinkedIdentityDocument>? UnlinkedIdentities { get; set; }

    [BsonElement("handle")]
    [BsonIgnoreIfNull]
    public string? Handle { get; set; }

    [BsonElement("bio")]
    [BsonIgnoreIfNull]
    public string? Bio { get; set; }

    [BsonElement("isProfilePublic")]
    [BsonIgnoreIfNull]
    public bool? IsProfilePublic { get; set; }

    [BsonElement("isWatchlistPublic")]
    [BsonIgnoreIfNull]
    public bool? IsWatchlistPublic { get; set; }

    [BsonElement("isWatchedPublic")]
    [BsonIgnoreIfNull]
    public bool? IsWatchedPublic { get; set; }

    [BsonElement("uiTheme")]
    public string UiTheme { get; set; } = "system";

    [BsonElement("accentColor")]
    [BsonIgnoreIfNull]
    public string? AccentColor { get; set; }

    [BsonElement("ratingScale")]
    public string RatingScale { get; set; } = "five";

    [BsonElement("dimWatched")]
    [BsonIgnoreIfDefault]
    public bool DimWatched { get; set; }

    [BsonElement("avatarId")]
    [BsonIgnoreIfNull]
    public string? AvatarId { get; set; }

    [BsonElement("avatarPhoto")]
    [BsonIgnoreIfNull]
    public AvatarPhotoDocument? AvatarPhoto { get; set; }

    [BsonElement("banner")]
    [BsonIgnoreIfNull]
    public ProfileBannerDocument? Banner { get; set; }

    [BsonElement("bannerPhoto")]
    [BsonIgnoreIfNull]
    public BannerPhotoDocument? BannerPhoto { get; set; }

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

    [BsonElement("letterboxdPendingChoiceKeys")]
    [BsonIgnoreIfNull]
    public List<string>? LetterboxdPendingChoiceKeys { get; set; }

    [BsonElement("letterboxdSyncWatchlist")]
    [BsonIgnoreIfNull]
    public bool? LetterboxdSyncWatchlist { get; set; }

    [BsonElement("letterboxdSyncWatched")]
    [BsonIgnoreIfNull]
    public bool? LetterboxdSyncWatched { get; set; }

    [BsonElement("letterboxdWatchlistCount")]
    [BsonIgnoreIfDefault]
    public int LetterboxdWatchlistCount { get; set; }

    [BsonElement("letterboxdWatchedCount")]
    [BsonIgnoreIfDefault]
    public int LetterboxdWatchedCount { get; set; }

    [BsonElement("notificationPreferences")]
    [BsonIgnoreIfNull]
    public List<NotificationPreferenceEntryDocument>? NotificationPreferences { get; set; }

    [BsonElement("eventTemplates")]
    [BsonIgnoreIfNull]
    public List<EventTemplateDocument>? EventTemplates { get; set; }

    [BsonElement("favorites")]
    [BsonIgnoreIfNull]
    public List<FavoriteTitleDocument>? Favorites { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [BsonElement("version")]
    public long Version { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class EventTemplateDocument
{
    [BsonElement("id")]
    public string Id { get; set; } = string.Empty;

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("config")]
    public EventConfigDocument Config { get; set; } = new();

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class FavoriteTitleDocument
{
    [BsonElement("tmdbId")]
    public int TmdbId { get; set; }

    [BsonElement("mediaType")]
    public string MediaType { get; set; } = "movie";

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("year")]
    public string Year { get; set; } = string.Empty;

    [BsonElement("posterPath")]
    [BsonIgnoreIfNull]
    public string? PosterPath { get; set; }
}

[BsonIgnoreExtraElements]
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

[BsonIgnoreExtraElements]
public sealed class UnlinkedIdentityDocument
{
    [BsonElement("provider")]
    public string Provider { get; set; } = string.Empty;

    [BsonElement("subject")]
    public string Subject { get; set; } = string.Empty;

    [BsonElement("unlinkedAt")]
    public DateTime UnlinkedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class NotificationPreferenceEntryDocument
{
    [BsonElement("type")]
    public int Type { get; set; }

    [BsonElement("enabled")]
    public bool Enabled { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class ProfileBannerDocument
{
    [BsonElement("source")]
    public string Source { get; set; } = string.Empty;

    [BsonElement("tmdbId")]
    [BsonIgnoreIfNull]
    public int? TmdbId { get; set; }

    [BsonElement("title")]
    [BsonIgnoreIfNull]
    public string? Title { get; set; }

    [BsonElement("imagePath")]
    [BsonIgnoreIfNull]
    public string? ImagePath { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class BannerPhotoDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class AvatarPhotoDocument
{
    [BsonElement("key")]
    public string Key { get; set; } = string.Empty;

    [BsonElement("isActive")]
    public bool IsActive { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
