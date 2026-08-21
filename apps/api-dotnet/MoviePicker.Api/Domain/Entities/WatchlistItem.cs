namespace MoviePicker.Api.Domain.Entities;

public sealed record WatchlistItem
{
    public string Id { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public double? VoteAverage { get; init; }
    public int? RuntimeMinutes { get; init; }
    public string? LetterboxdSlug { get; init; }
    public IReadOnlyList<int> GenreIds { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
}
