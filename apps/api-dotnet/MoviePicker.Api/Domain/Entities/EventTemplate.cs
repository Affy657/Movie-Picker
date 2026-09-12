namespace MoviePicker.Api.Domain.Entities;

public sealed record EventTemplate
{
    public const int MaxPerUser = 5;

    public const int MaxNameLength = 60;

    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public EventConfig Config { get; init; } = new();
    public DateTimeOffset CreatedAt { get; init; }
}
