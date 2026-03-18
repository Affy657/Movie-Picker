namespace MoviePicker.Api.Application.DTOs;

public sealed class JoinEventResult
{
    public ParticipantResponse Participant { get; init; } = null!;
    public bool IsNew { get; init; }
    public string Message { get; init; } = string.Empty;
}
