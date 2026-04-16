using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class SeenMarkMapper
{
    public static SeenMark ToDomain(SeenMarkDocument d) =>
        new()
        {
            Id = d.Id,
            EventId = d.EventId,
            MovieId = d.MovieId,
            ParticipantId = d.ParticipantId,
            CreatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.CreatedAt, DateTimeKind.Utc)),
            UpdatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.UpdatedAt, DateTimeKind.Utc))
        };
}
