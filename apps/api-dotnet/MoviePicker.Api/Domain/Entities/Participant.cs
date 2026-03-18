namespace MoviePicker.Api.Domain.Entities;

public sealed class Participant
{
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string Pseudo { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
