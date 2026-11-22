using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class GlobalSearchResponse
{
    public IReadOnlyList<GlobalSearchTitleItem> Titles { get; init; } = [];
    public IReadOnlyList<GlobalSearchSagaItem> Sagas { get; init; } = [];
    public IReadOnlyList<FollowUserItem> Members { get; init; } = [];
    public IReadOnlyList<GlobalSearchNightItem> Nights { get; init; } = [];
    public IReadOnlyList<GlobalSearchGroupItem> Groups { get; init; } = [];
    public IReadOnlyList<GlobalSearchListItem> Lists { get; init; } = [];
    public IReadOnlyList<GlobalSearchPublicListItem> PublicLists { get; init; } = [];
}

public sealed class GlobalSearchTitleItem
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
}

public sealed class GlobalSearchSagaItem
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public int MovieCount { get; init; }
}

public sealed class GlobalSearchNightItem
{
    public string Slug { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public bool IsFinished { get; init; }
}

public sealed class GlobalSearchGroupItem
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int MemberCount { get; init; }
}

public sealed class GlobalSearchListItem
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int ItemCount { get; init; }
    public string? PosterPath { get; init; }
}

public sealed class GlobalSearchPublicListItem
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int ItemCount { get; init; }
    public string? PosterPath { get; init; }
    public string OwnerHandle { get; init; } = string.Empty;
    public string OwnerDisplayName { get; init; } = string.Empty;
}
