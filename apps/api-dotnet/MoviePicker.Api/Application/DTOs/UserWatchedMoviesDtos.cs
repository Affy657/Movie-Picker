using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class UserWatchedMoviesResponse
{
    public IReadOnlyList<UserWatchedMovieItem> Items { get; init; } = [];
}

public sealed class UserWatchedMovieItem
{
    public int TmdbId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public DateTimeOffset WatchedAt { get; init; }
}
