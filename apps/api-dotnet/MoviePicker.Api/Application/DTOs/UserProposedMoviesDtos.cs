using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class UserProposedMoviesResponse
{
    public IReadOnlyList<UserProposedMovieItem> Items { get; init; } = [];
}

public sealed class UserProposedMovieItem
{
    public int TmdbId { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public DateTimeOffset LastProposedAt { get; init; }
    public int ProposalCount { get; init; }
}
