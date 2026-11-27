using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.DTOs;

public sealed class ActiveSessionResponse
{
    public string Id { get; init; } = string.Empty;
    public string? Browser { get; init; }
    public string? OperatingSystem { get; init; }
    public DeviceKind DeviceKind { get; init; }
    public DateTimeOffset SignedInAt { get; init; }
    public DateTimeOffset? LastActiveAt { get; init; }
    public bool Current { get; init; }
}

public sealed class ActiveSessionListResponse
{
    public IReadOnlyList<ActiveSessionResponse> Items { get; init; } = Array.Empty<ActiveSessionResponse>();
}
