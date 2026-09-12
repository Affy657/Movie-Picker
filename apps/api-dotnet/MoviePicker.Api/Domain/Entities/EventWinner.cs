namespace MoviePicker.Api.Domain.Entities;

public sealed record EventWinner
{
    public string MovieId { get; init; } = string.Empty;
    public WinnerPickMethod Method { get; init; }
    public DateTimeOffset PickedAt { get; init; }
}
