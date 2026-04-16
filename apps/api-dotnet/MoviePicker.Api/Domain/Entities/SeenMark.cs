namespace MoviePicker.Api.Domain.Entities;

/// <summary>Marque « déjà vu » posée par un participant sur un film d'une soirée. Neutre dans la pondération de la roue.</summary>
public sealed record SeenMark
{
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string MovieId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
