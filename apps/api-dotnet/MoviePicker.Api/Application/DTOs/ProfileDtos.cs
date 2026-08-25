namespace MoviePicker.Api.Application.DTOs;

public sealed class PublicProfileResponse
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public string? Bio { get; init; }
    public DateTimeOffset MemberSince { get; init; }
    public int FollowingCount { get; init; }
    public int FollowersCount { get; init; }
    public bool IsSupporter { get; init; }
    public bool? IsFollowedByMe { get; init; }
}

public sealed class HandleAvailabilityResponse
{
    public string Handle { get; init; } = string.Empty;
    public bool Available { get; init; }
    public string? Reason { get; init; }
}

public sealed class FollowUserItem
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool? IsFollowedByMe { get; init; }
}

public sealed class FollowListResponse
{
    public IReadOnlyList<FollowUserItem> Items { get; init; } = [];
}
