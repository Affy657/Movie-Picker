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
        Title = m.Title,
        Year = m.Year,
        PosterPath = m.PosterPath,
        CreatedAt = m.CreatedAt.UtcDateTime,
        UpdatedAt = m.UpdatedAt.UtcDateTime
    };
}
