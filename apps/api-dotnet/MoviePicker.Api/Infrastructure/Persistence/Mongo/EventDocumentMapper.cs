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
                ThemeColor = doc.Config.ThemeColor,
                EndDate = doc.Config.EndDate.HasValue
                    ? new DateTimeOffset(doc.Config.EndDate.Value, TimeSpan.Zero)
                    : null,
                MaxProposalsPerParticipant = doc.Config.MaxProposalsPerParticipant,
                MaxParticipants = doc.Config.MaxParticipants,
                WheelMode = ParseWheelMode(doc.Config.WheelMode),
                RichSharePreview = doc.Config.RichSharePreview,
                AllowSeries = doc.Config.AllowSeries
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
            WinnerPickMethod = ParseWinnerPickMethod(doc.WinnerPickMethod),
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
                ThemeColor = evt.Config.ThemeColor,
                EndDate = evt.Config.EndDate?.UtcDateTime,
                MaxProposalsPerParticipant = evt.Config.MaxProposalsPerParticipant,
                MaxParticipants = evt.Config.MaxParticipants,
                WheelMode = ToWheelModeString(evt.Config.WheelMode),
                RichSharePreview = evt.Config.RichSharePreview,
                AllowSeries = evt.Config.AllowSeries
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
            WinnerPickMethod = ToWinnerPickMethodString(evt.WinnerPickMethod),
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

    private static WinnerPickMethod? ParseWinnerPickMethod(string? raw) =>
        raw?.Trim().ToLowerInvariant() switch
        {
            "manual" => WinnerPickMethod.Manual,
            "wheel" => WinnerPickMethod.Wheel,
            _ => null
        };

    private static string? ToWinnerPickMethodString(WinnerPickMethod? method) =>
        method switch
        {
            WinnerPickMethod.Manual => "manual",
            WinnerPickMethod.Wheel => "wheel",
            _ => null
        };
}
