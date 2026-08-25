using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class UserMoviesResponse
{
    public IReadOnlyList<UserMovieItem> Items { get; init; } = [];
    public int TotalCount { get; init; }
}

public sealed class UserMovieItem
{
    public int TmdbId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public DateTimeOffset ProposedAt { get; init; }
    public bool IsWinner { get; init; }
}
