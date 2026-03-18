using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class VoteMapper
{
    public static Vote ToDomain(VoteDocument d) => new()
    {
        Id = d.Id,
        EventId = d.EventId,
        MovieId = d.MovieId,
        ParticipantId = d.ParticipantId,
        Value = d.Value,
        CreatedAt = new DateTimeOffset(d.CreatedAt, TimeSpan.Zero),
        UpdatedAt = new DateTimeOffset(d.UpdatedAt, TimeSpan.Zero)
    };
}
