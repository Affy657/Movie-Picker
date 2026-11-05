using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class MovieRatingMapper
{
    public static MovieRating ToDomain(MovieRatingDocument d) =>
        new()
        {
            Id = d.Id,
            EventId = d.EventId,
            MovieId = d.MovieId,
            ParticipantId = d.ParticipantId,
            Value = d.Value,
            CreatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.CreatedAt, DateTimeKind.Utc)),
            UpdatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.UpdatedAt, DateTimeKind.Utc))
        };
}
