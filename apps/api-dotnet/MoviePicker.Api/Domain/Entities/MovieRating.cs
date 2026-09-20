namespace MoviePicker.Api.Domain.Entities;

public sealed record MovieRating
{
    public const int MinValue = 1;
    public const int MaxValue = 10;

    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string MovieId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public int Value { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public static bool IsValidValue(int value) => value is >= MinValue and <= MaxValue;
}
