namespace MoviePicker.Api.Application.DTOs;

public sealed class RemoveParticipantResponse
{
    public string ParticipantId { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;

    /// <summary>Nombre de films retirés en cascade (proposés par ce participant).</summary>
    public int RemovedMovies { get; init; }
}
