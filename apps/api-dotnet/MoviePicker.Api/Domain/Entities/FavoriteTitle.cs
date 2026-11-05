namespace MoviePicker.Api.Domain.Entities;

public sealed record FavoriteTitle
{
    public const int MaxPerUser = 3;

    public int TmdbId { get; init; }
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;
    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }

    public bool Is(int tmdbId, MovieMediaType mediaType) => TmdbId == tmdbId && MediaType == mediaType;
}
