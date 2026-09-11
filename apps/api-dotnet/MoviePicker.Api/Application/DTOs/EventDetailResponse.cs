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
    public IReadOnlyList<EventWinnerResponse> Winners { get; init; } =
        Array.Empty<EventWinnerResponse>();
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsHost { get; init; }
    public bool IsFinished { get; init; }
    public string Lifecycle { get; init; } = string.Empty;


    public ParticipantResponse? MyParticipant { get; init; }

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    public int VotersCount { get; init; }

    public IReadOnlyList<EventParticipantSummaryResponse> Participants { get; init; } =
        Array.Empty<EventParticipantSummaryResponse>();
}

public sealed class EventWinnerResponse
{
    public string MovieId { get; init; } = string.Empty;
    public string PickMethod { get; init; } = string.Empty;
    public DateTimeOffset PickedAt { get; init; }
    public WinnerMovieResponse? Movie { get; init; }
}

public sealed class EventParticipantSummaryResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;
    public bool IsCreator { get; init; }
    public string AvatarId { get; init; } = string.Empty;

    public string? Handle { get; init; }
}
