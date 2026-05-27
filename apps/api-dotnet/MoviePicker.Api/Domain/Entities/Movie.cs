namespace MoviePicker.Api.Domain.Entities;

public enum MovieMediaType
{
    Movie,
    Tv
}

public sealed record Movie
{
    public string Id { get; init; } = string.Empty;
    public string EventId { get; init; } = string.Empty;
    public string ParticipantId { get; init; } = string.Empty;
    public int TmdbId { get; init; }

    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public string? PitchNote { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
