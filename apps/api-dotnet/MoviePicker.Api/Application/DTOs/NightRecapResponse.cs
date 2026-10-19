namespace MoviePicker.Api.Application.DTOs;

public sealed class NightRecapResponse
{
    public string RecapSlug { get; init; } = string.Empty;
    public string? EventSlug { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public EventConfigResponse? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public bool IsFinished { get; init; }
    public string Lifecycle { get; init; } = string.Empty;
    public IReadOnlyList<EventWinnerResponse> Winners { get; init; } = Array.Empty<EventWinnerResponse>();
    public ParticipantResponse? MyParticipant { get; init; }
    public int ParticipantCount { get; init; }
    public int MovieCount { get; init; }
    public IReadOnlyList<EventParticipantSummaryResponse> Participants { get; init; } =
        Array.Empty<EventParticipantSummaryResponse>();
    public IReadOnlyList<MovieWithScoreResponse> WinnerMovies { get; init; } = Array.Empty<MovieWithScoreResponse>();
}
