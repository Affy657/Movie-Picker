using MoviePicker.Api.Domain;
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
            WinnerPickedAt = doc.WinnerPickedAt.HasValue
                ? new DateTimeOffset(doc.WinnerPickedAt.Value, TimeSpan.Zero)
                : null,
            Recurrence = ParseRecurrence(doc.Recurrence),
            RecurrenceParentEventId = doc.RecurrenceParentEventId,
            NextOccurrenceEventId = doc.NextOccurrenceEventId,
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
            WinnerPickedAt = evt.WinnerPickedAt?.UtcDateTime,
            Recurrence = ToRecurrenceString(evt.Recurrence),
            RecurrenceParentEventId = evt.RecurrenceParentEventId,
            NextOccurrenceEventId = evt.NextOccurrenceEventId,
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

    private static RecurrenceFrequency? ParseRecurrence(string? raw) =>
        raw?.Trim().ToLowerInvariant() switch
        {
            "weekly" => RecurrenceFrequency.Weekly,
            "biweekly" => RecurrenceFrequency.Biweekly,
            "monthly" => RecurrenceFrequency.Monthly,
            _ => null
        };

    private static string? ToRecurrenceString(RecurrenceFrequency? frequency) =>
        frequency switch
        {
            RecurrenceFrequency.Weekly => "weekly",
            RecurrenceFrequency.Biweekly => "biweekly",
            RecurrenceFrequency.Monthly => "monthly",
            _ => null
        };

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
