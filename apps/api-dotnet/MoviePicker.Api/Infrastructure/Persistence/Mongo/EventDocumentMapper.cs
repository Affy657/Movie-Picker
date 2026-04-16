using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class EventDocumentMapper
{
    public static Event ToDomain(EventDocument doc)
    {
        EventConfig? config = null;
        if (doc.Config is not null)
        {
            config = new EventConfig
            {
                Theme = doc.Config.Theme,
                EndDate = doc.Config.EndDate.HasValue
                    ? new DateTimeOffset(doc.Config.EndDate.Value, TimeSpan.Zero)
                    : null,
                MaxProposalsPerParticipant = doc.Config.MaxProposalsPerParticipant,
                WheelMode = ParseWheelMode(doc.Config.WheelMode),
                RichSharePreview = doc.Config.RichSharePreview
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
            CreatorUserId = doc.CreatorUserId,
            Config = config,
            ClosedAt = doc.ClosedAt.HasValue ? new DateTimeOffset(doc.ClosedAt.Value, TimeSpan.Zero) : null,
            WinnerMovieId = doc.WinnerMovieId,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
        };
    }

    public static EventDocument ToDocument(Event evt)
    {
        EventConfigDocument? config = null;
        if (evt.Config is not null)
        {
            config = new EventConfigDocument
            {
                Theme = evt.Config.Theme,
                EndDate = evt.Config.EndDate?.UtcDateTime,
                MaxProposalsPerParticipant = evt.Config.MaxProposalsPerParticipant,
                WheelMode = ToWheelModeString(evt.Config.WheelMode),
                RichSharePreview = evt.Config.RichSharePreview
            };
        }

        return new EventDocument
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            Config = config,
            ClosedAt = evt.ClosedAt?.UtcDateTime,
            WinnerMovieId = evt.WinnerMovieId,
            CreatedAt = evt.CreatedAt.UtcDateTime,
            UpdatedAt = evt.UpdatedAt.UtcDateTime
        };
    }

    private static WheelMode ParseWheelMode(string? raw) =>
        raw?.Trim().ToLowerInvariant() switch
        {
            "weightedbyvotes" => WheelMode.WeightedByVotes,
            _ => WheelMode.StrictRandom
        };

    private static string ToWheelModeString(WheelMode mode) =>
        mode == WheelMode.WeightedByVotes ? "weightedByVotes" : "strictRandom";
}
