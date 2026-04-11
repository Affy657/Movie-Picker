using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

internal static class ParticipantDocumentMapper
{
    public static Participant ToDomain(ParticipantDocument doc) => new()
    {
        Id = doc.Id,
        EventId = doc.EventId,
        Pseudo = doc.Pseudo,
        UserId = doc.UserId,
        CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
        UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
    };

    public static ParticipantDocument ToDocument(Participant p) => new()
    {
        Id = p.Id,
        EventId = p.EventId,
        Pseudo = p.Pseudo,
        UserId = string.IsNullOrWhiteSpace(p.UserId) ? null : p.UserId,
        CreatedAt = p.CreatedAt.UtcDateTime,
        UpdatedAt = p.UpdatedAt.UtcDateTime
    };
}
