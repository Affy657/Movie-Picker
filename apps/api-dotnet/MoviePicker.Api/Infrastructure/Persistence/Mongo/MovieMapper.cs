using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class MovieMapper
{
    public static Movie ToDomain(MovieDocument d) => new()
    {
        Id = d.Id,
        EventId = d.EventId,
        ParticipantId = d.ParticipantId,
        TmdbId = d.TmdbId,
        MediaType = ParseMediaType(d.MediaType),
        Title = d.Title,
        Year = d.Year,
        PosterPath = d.PosterPath,
        CreatedAt = new DateTimeOffset(d.CreatedAt, TimeSpan.Zero),
        UpdatedAt = new DateTimeOffset(d.UpdatedAt, TimeSpan.Zero)
    };

    public static MovieDocument ToDocument(Movie m) => new()
    {
        Id = m.Id,
        EventId = m.EventId,
        ParticipantId = m.ParticipantId,
        TmdbId = m.TmdbId,
        MediaType = MediaTypeToString(m.MediaType),
        Title = m.Title,
        Year = m.Year,
        PosterPath = m.PosterPath,
        CreatedAt = m.CreatedAt.UtcDateTime,
        UpdatedAt = m.UpdatedAt.UtcDateTime
    };

    public static string MediaTypeToString(MovieMediaType m) =>
        m == MovieMediaType.Tv ? "tv" : "movie";

    private static MovieMediaType ParseMediaType(string? raw) =>
        string.Equals(raw?.Trim(), "tv", StringComparison.OrdinalIgnoreCase)
            ? MovieMediaType.Tv
            : MovieMediaType.Movie;
}
