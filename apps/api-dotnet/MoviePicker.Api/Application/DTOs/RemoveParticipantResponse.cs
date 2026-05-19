namespace MoviePicker.Api.Application.DTOs;

public sealed class RemoveParticipantResponse
{
    public string ParticipantId { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;

    public int RemovedMovies { get; init; }
}
