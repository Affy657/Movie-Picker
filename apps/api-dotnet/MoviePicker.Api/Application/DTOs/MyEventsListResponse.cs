namespace MoviePicker.Api.Application.DTOs;

public sealed class MyEventsListResponse
{
    public IReadOnlyList<MyEventSummaryDto> Events { get; init; } = Array.Empty<MyEventSummaryDto>();
    public bool HasMore { get; init; }
    public int TotalActive { get; init; }
    public int TotalFinished { get; init; }
}

public sealed class MyEventSummaryDto
{
    public string Id { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool IsCreator { get; init; }
    public bool IsParticipant { get; init; }

    public string Lifecycle { get; init; } = string.Empty;

    public int ParticipantCount { get; init; }

    public int MovieCount { get; init; }

    public int? MaxParticipants { get; init; }

    public string? Theme { get; init; }

    public IReadOnlyList<MyEventWinnerMovieDto> WinnerMovies { get; init; } =
        Array.Empty<MyEventWinnerMovieDto>();

    public DateTimeOffset? AutoCloseAt { get; init; }
}

public sealed class MyEventWinnerMovieDto
{
    public string Title { get; init; } = string.Empty;

    public string? PosterPath { get; init; }
}
