using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class GlobalSearchResponse
{
    public IReadOnlyList<GlobalSearchTitleItem> Titles { get; init; } = [];
    public IReadOnlyList<FollowUserItem> Members { get; init; } = [];
    public IReadOnlyList<GlobalSearchNightItem> Nights { get; init; } = [];
}

public sealed class GlobalSearchTitleItem
{
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
}

public sealed class GlobalSearchNightItem
{
    public string Slug { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public bool IsFinished { get; init; }
}
