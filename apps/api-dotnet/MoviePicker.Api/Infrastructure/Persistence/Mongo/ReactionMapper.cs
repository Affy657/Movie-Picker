using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class ReactionMapper
{
    public static Reaction ToDomain(ReactionDocument d) =>
        new()
        {
            Id = d.Id,
            EventId = d.EventId,
            MovieId = d.MovieId,
            ParticipantId = d.ParticipantId,
            ReactionId = d.ReactionId,
            CreatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.CreatedAt, DateTimeKind.Utc)),
            UpdatedAt = new DateTimeOffset(DateTime.SpecifyKind(d.UpdatedAt, DateTimeKind.Utc))
        };
}
