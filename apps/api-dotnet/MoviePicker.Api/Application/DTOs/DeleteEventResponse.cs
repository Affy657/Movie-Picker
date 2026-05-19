namespace MoviePicker.Api.Application.DTOs;

public sealed class DeleteEventResponse
{
    public string EventId { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;

    public long RemovedParticipants { get; init; }

    public long RemovedMovies { get; init; }

    public long RemovedVotes { get; init; }

    public long RemovedSeenMarks { get; init; }
}
