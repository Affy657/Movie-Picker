using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.DTOs;

public sealed class MyNightMoviesResponse
{
    public IReadOnlyList<MyNightMovieItem> Items { get; init; } = [];
}

public sealed class MyNightMovieItem
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
    public bool ProposedByMe { get; init; }
    public bool IsWinner { get; init; }
    public bool IsWatched { get; init; }
    public NightMovieProposerResponse? LastProposer { get; init; }
}

public sealed class NightMovieProposerResponse
{
    public string Pseudo { get; init; } = string.Empty;
    public string? AvatarId { get; init; }
    public bool IsMe { get; init; }
}
