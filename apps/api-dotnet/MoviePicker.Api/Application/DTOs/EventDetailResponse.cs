using System.Text.Json.Serialization;

namespace MoviePicker.Api.Application.DTOs;

public sealed class EventDetailResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public required EventConfigResponse Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public string? WinnerPickMethod { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsHost { get; init; }
    public bool IsFinished { get; init; }
    public WinnerMovieResponse? WinnerMovie { get; init; }

    public ParticipantResponse? MyParticipant { get; init; }

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    public IReadOnlyList<EventParticipantSummaryResponse> Participants { get; init; } =
        Array.Empty<EventParticipantSummaryResponse>();
}

public sealed class EventParticipantSummaryResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;
    public bool IsCreator { get; init; }
    public string AvatarId { get; init; } = string.Empty;

    /// <summary>Public handle of the linked account, or null for legacy guest participants.</summary>
    public string? Handle { get; init; }
}
