namespace MoviePicker.Api.Application.DTOs;

public sealed class PublicProfileResponse
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public DateTimeOffset MemberSince { get; init; }
}

public sealed class HandleAvailabilityResponse
{
    public string Handle { get; init; } = string.Empty;
    public bool Available { get; init; }
    public string? Reason { get; init; }
}
