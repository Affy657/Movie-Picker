using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

[BsonIgnoreExtraElements]
public sealed class EventDocument
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("date")]
    public string Date { get; set; } = string.Empty;

    [BsonElement("time")]
    public string Time { get; set; } = string.Empty;

    [BsonElement("hostToken")]
    public string HostToken { get; set; } = string.Empty;

    [BsonElement("slug")]
    public string Slug { get; set; } = string.Empty;

    [BsonElement("creatorUserId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? CreatorUserId { get; set; }

    [BsonElement("config")]
    [BsonIgnoreIfNull]
    public EventConfigDocument? Config { get; set; }

    [BsonElement("closedAt")]
    public DateTime? ClosedAt { get; set; }

    [BsonElement("winnerMovieId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? WinnerMovieId { get; set; }

    [BsonElement("winnerPickMethod")]
    [BsonIgnoreIfNull]
    public string? WinnerPickMethod { get; set; }

    [BsonElement("winnerPickedAt")]
    [BsonIgnoreIfNull]
    public DateTime? WinnerPickedAt { get; set; }

    [BsonElement("winners")]
    [BsonIgnoreIfNull]
    public List<EventWinnerDocument>? Winners { get; set; }

    [BsonElement("winnerAnnouncedAt")]
    [BsonIgnoreIfNull]
    public DateTime? WinnerAnnouncedAt { get; set; }

    [BsonElement("recurrence")]
    [BsonIgnoreIfNull]
    public string? Recurrence { get; set; }

    [BsonElement("recurrenceParentEventId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? RecurrenceParentEventId { get; set; }

    [BsonElement("nextOccurrenceEventId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? NextOccurrenceEventId { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class EventConfigDocument
{
    [BsonElement("theme")]
    [BsonIgnoreIfNull]
    public string? Theme { get; set; }

    [BsonElement("themeColor")]
    [BsonIgnoreIfNull]
    public int? ThemeColor { get; set; }

    [BsonElement("maxProposalsPerParticipant")]
    [BsonIgnoreIfNull]
    public int? MaxProposalsPerParticipant { get; set; }

    [BsonElement("maxParticipants")]
    [BsonIgnoreIfNull]
    public int? MaxParticipants { get; set; }

    [BsonElement("wheelMode")]
    public string WheelMode { get; set; } = "weightedByVotes";

    [BsonElement("richSharePreview")]
    [BsonIgnoreIfDefault]
    public bool RichSharePreview { get; set; }

    [BsonElement("allowSeries")]
    [BsonIgnoreIfDefault]
    public bool AllowSeries { get; set; }

    [BsonElement("winnerCount")]
    [BsonIgnoreIfNull]
    public int? WinnerCount { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class EventWinnerDocument
{
    [BsonElement("movieId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string MovieId { get; set; } = string.Empty;

    [BsonElement("pickMethod")]
    public string PickMethod { get; set; } = "wheel";

    [BsonElement("pickedAt")]
    public DateTime PickedAt { get; set; }
}
