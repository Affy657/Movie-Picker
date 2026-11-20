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
    public bool IsWatchlistPublic { get; init; }
    public int? WatchlistCount { get; init; }
    public bool IsWatchedPublic { get; init; }
    public IReadOnlyList<FavoriteTitleResponse> Favorites { get; init; } = [];
    public ProfileBannerResponse? Banner { get; init; }
}

public sealed class FollowUserItem
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool? IsFollowedByMe { get; init; }

    public static FollowUserItem From(DisplayedPerson person, bool? isFollowedByMe) => new()
    {
        Handle = person.Handle,
        DisplayName = person.DisplayName,
        AvatarId = person.AvatarId,
        IsFollowedByMe = isFollowedByMe
    };
}

public sealed class FollowListResponse
{
    public IReadOnlyList<FollowUserItem> Items { get; init; } = [];
}
