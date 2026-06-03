namespace MoviePicker.Api.Domain.Entities;

public sealed record Follow
{
    public string Id { get; init; } = string.Empty;
    public string FollowerId { get; init; } = string.Empty;
    public string FolloweeId { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
}
