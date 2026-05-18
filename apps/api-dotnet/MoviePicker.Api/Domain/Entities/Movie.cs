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

    /// <summary>
    /// Type TMDB de la proposition. Défaut <see cref="MovieMediaType.Movie"/> ; <see cref="MovieMediaType.Tv"/>
    /// uniquement quand <c>EventConfig.AllowSeries</c> est activé. Les IDs TMDB <c>movie</c> et <c>tv</c>
    /// étant disjoints, ce champ fait partie de l'identité fonctionnelle d'une proposition.
    /// </summary>
    public MovieMediaType MediaType { get; init; } = MovieMediaType.Movie;

    public string Title { get; init; } = string.Empty;
    public string Year { get; init; } = string.Empty;
    public string? PosterPath { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
