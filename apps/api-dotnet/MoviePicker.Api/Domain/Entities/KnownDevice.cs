namespace MoviePicker.Api.Domain.Entities;

public sealed record KnownDevice
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(400);

    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public string TokenHash { get; init; } = string.Empty;
    public string? Browser { get; init; }
    public string? OperatingSystem { get; init; }
    public DeviceKind Kind { get; init; }
    public DateTimeOffset FirstSeenAt { get; init; }
    public DateTimeOffset LastSeenAt { get; init; }

    public DateTimeOffset ForgottenAt => LastSeenAt + Retention;
}
