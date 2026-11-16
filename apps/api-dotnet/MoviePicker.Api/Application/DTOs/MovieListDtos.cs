using System.ComponentModel.DataAnnotations;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class CreateMovieListRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }

    public bool? IsPublic { get; init; }

    public AddWatchlistItemRequest? FirstItem { get; init; }
}

public sealed class UpdateMovieListRequest
{
    [Required]
    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }

    public bool? IsPublic { get; init; }
}

public sealed class MovieListPersonResponse
{
    public string UserId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
}

public sealed record MovieListAudience(
    MovieListRole Role,
    MovieListPersonResponse Owner,
    int MemberCount,
    IReadOnlyList<MovieListPersonResponse> MemberPreview);

public sealed class MovieListSummaryResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsPublic { get; init; }
    public int ItemCount { get; init; }
    public IReadOnlyList<string> PosterPaths { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public bool ContainsMovie { get; init; }
    public int WatchedCount { get; init; }
    public MovieListRole Role { get; init; }
    public MovieListPersonResponse Owner { get; init; } = new();
    public int MemberCount { get; init; }
    public IReadOnlyList<MovieListPersonResponse> MemberPreview { get; init; } = [];

    public static MovieListSummaryResponse From(
        MovieListSummary summary,
        MovieListTitle? probe,
        int watchedCount,
        MovieListAudience audience) => new()
        {
            WatchedCount = watchedCount,
            Id = summary.Id,
            Name = summary.Name,
            Description = summary.Description,
            IsPublic = summary.IsPublic,
            ItemCount = summary.ItemCount,
            PosterPaths = summary.PosterPaths,
            CreatedAt = summary.CreatedAt,
            UpdatedAt = summary.UpdatedAt,
            ContainsMovie = probe is not null && summary.Titles.Contains(probe),
            Role = audience.Role,
            Owner = audience.Owner,
            MemberCount = audience.MemberCount,
            MemberPreview = audience.MemberPreview
        };
}

public sealed class MovieListsResponse
{
    public IReadOnlyList<MovieListSummaryResponse> Items { get; init; } = [];
}

public sealed class MovieListItemResponse
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public bool IsWatched { get; init; }
    public MovieListPersonResponse? AddedBy { get; init; }

    public static MovieListItemResponse From(MovieListItem entry, bool isWatched, MovieListPersonResponse? addedBy) => new()
    {
        IsWatched = isWatched,
        AddedBy = addedBy,
        CreatedAt = entry.AddedAt,
        TmdbId = entry.TmdbId,
        MediaType = entry.MediaType,
        Title = entry.Title,
        Year = entry.Year,
        PosterPath = entry.PosterPath,
        VoteAverage = entry.VoteAverage,
        RuntimeMinutes = entry.RuntimeMinutes,
        GenreIds = entry.GenreIds
    };
}

public sealed class MovieListResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsPublic { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public MovieListRole Role { get; init; }
    public MovieListPersonResponse Owner { get; init; } = new();
    public int MemberCount { get; init; }
    public IReadOnlyList<MovieListPersonResponse> MemberPreview { get; init; } = [];
    public IReadOnlyList<MovieListItemResponse> Items { get; init; } = [];

    public static MovieListResponse From(
        MovieList list,
        Func<MovieListItem, bool> isWatched,
        MovieListAudience audience,
        Func<MovieListItem, MovieListPersonResponse?> addedBy) =>
        new()
        {
            Id = list.Id,
            Name = list.Name,
            Description = list.Description,
            IsPublic = list.IsPublic,
            CreatedAt = list.CreatedAt,
            UpdatedAt = list.UpdatedAt,
            Role = audience.Role,
            Owner = audience.Owner,
            MemberCount = audience.MemberCount,
            MemberPreview = audience.MemberPreview,
            Items = [.. list.Items.Select(item => MovieListItemResponse.From(item, isWatched(item), addedBy(item)))]
        };
}

public sealed class InviteToMovieListRequest
{
    [Required]
    [MaxLength(64)]
    public string UserId { get; init; } = string.Empty;
}

public sealed class MovieListMemberResponse
{
    public string UserId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public bool IsOwner { get; init; }
    public DateTimeOffset JoinedAt { get; init; }
}

public sealed class MovieListPendingInvitationResponse
{
    public string UserId { get; init; } = string.Empty;
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
    public DateTimeOffset InvitedAt { get; init; }
}

public sealed class MovieListInviteLinkResponse
{
    public string Token { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; init; }
    public bool Active { get; init; }

    public static MovieListInviteLinkResponse From(MovieListInviteLink link, DateTimeOffset now) => new()
    {
        Token = link.Token,
        ExpiresAt = link.ExpiresAt,
        Active = link.IsActive(now)
    };
}

public sealed class MovieListMembersResponse
{
    public int MaxMembers { get; init; } = MovieList.MaxMembers;
    public IReadOnlyList<MovieListMemberResponse> Members { get; init; } = [];
    public IReadOnlyList<MovieListPendingInvitationResponse>? Invitations { get; init; }
    public MovieListInviteLinkResponse? InviteLink { get; init; }
}

public sealed class MovieListInvitableUserResponse
{
    public string UserId { get; init; } = string.Empty;
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
}

public sealed class MovieListInvitableUsersResponse
{
    public IReadOnlyList<MovieListInvitableUserResponse> Users { get; init; } = [];
}

public sealed class MovieListInviterResponse
{
    public string? Handle { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;
}

public sealed class MovieListInvitePreviewResponse
{
    public string Name { get; init; } = string.Empty;
    public MovieListInviterResponse Owner { get; init; } = new();
    public int ItemCount { get; init; }
    public IReadOnlyList<string> PosterPaths { get; init; } = [];
    public bool IsFull { get; init; }
    public MovieListRole? Role { get; init; }
    public string? ListId { get; init; }
}

public sealed class ListCreatorResponse
{
    public string Handle { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string AvatarId { get; init; } = string.Empty;

    public static ListCreatorResponse From(User user) => new()
    {
        Handle = user.Handle,
        DisplayName = user.DisplayName,
        AvatarId = user.DisplayedAvatarId
    };

    public static ListCreatorResponse From(UserCard card) => new()
    {
        Handle = card.Handle ?? string.Empty,
        DisplayName = card.DisplayName,
        AvatarId = card.AvatarId
    };
}

public sealed class PublicListSummaryResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int ItemCount { get; init; }
    public IReadOnlyList<string> PosterPaths { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public int MemberCount { get; init; }
    public int? WatchedCount { get; init; }

    public static PublicListSummaryResponse From(MovieListSummary summary, int? watchedCount) => new()
    {
        Id = summary.Id,
        Name = summary.Name,
        Description = summary.Description,
        ItemCount = summary.ItemCount,
        PosterPaths = summary.PosterPaths,
        CreatedAt = summary.CreatedAt,
        UpdatedAt = summary.UpdatedAt,
        MemberCount = summary.MemberCount,
        WatchedCount = watchedCount
    };
}

public sealed class PublicListsResponse
{
    public IReadOnlyList<PublicListSummaryResponse> Items { get; init; } = [];
}

public sealed class PublicListResponse
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public int ItemCount { get; init; }
    public int MemberCount { get; init; }
    public int? WatchedCount { get; init; }
    public ListCreatorResponse Creator { get; init; } = new();
    public MovieListRole? ViewerRole { get; init; }
    public IReadOnlyList<MovieListItemResponse> Items { get; init; } = [];
}
