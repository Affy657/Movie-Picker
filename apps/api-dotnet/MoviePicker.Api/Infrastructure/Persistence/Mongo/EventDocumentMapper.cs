using MoviePicker.Api.Domain.Entities;
using MongoDB.Bson;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class EventDocumentMapper
{
    public static Event ToDomain(EventDocument doc)
    {
        EventConfig? config = null;
        if (doc.Config is not null)
        {
            DateTimeOffset? endDate = null;
            if (doc.Config.TryGetElement("endDate", out var endEl) && endEl.Value.IsValidDateTime)
                endDate = endEl.Value.ToUniversalTime();
            config = new EventConfig
            {
                Theme = doc.Config.TryGetElement("theme", out var t) ? t.Value.ToString() : null,
                EndDate = endDate,
                MaxProposalsPerParticipant = doc.Config.TryGetElement("maxProposalsPerParticipant", out var m) && m.Value.IsInt32 ? m.Value.AsInt32 : null
            };
        }

        return new Event
        {
            Id = doc.Id,
            Title = doc.Title,
            Date = doc.Date,
            Time = doc.Time,
            HostToken = doc.HostToken,
            Slug = doc.Slug,
            Config = config,
            ClosedAt = doc.ClosedAt.HasValue ? new DateTimeOffset(doc.ClosedAt.Value, TimeSpan.Zero) : null,
            WinnerMovieId = doc.WinnerMovieId,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
        };
    }

    public static EventDocument ToDocument(Event evt)
    {
        BsonDocument? config = null;
        if (evt.Config is not null)
        {
            config = new BsonDocument();
            if (evt.Config.Theme is { } theme)
                config["theme"] = theme;
            if (evt.Config.EndDate is { } endDate)
                config["endDate"] = endDate.UtcDateTime;
            if (evt.Config.MaxProposalsPerParticipant is { } max)
                config["maxProposalsPerParticipant"] = max;
        }

        return new EventDocument
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            Config = config,
            ClosedAt = evt.ClosedAt?.UtcDateTime,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt.UtcDateTime,
            UpdatedAt = evt.UpdatedAt.UtcDateTime
        };
    }
}
