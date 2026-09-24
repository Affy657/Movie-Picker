using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Persistence.Mongo;

public static class EventDocumentMapper
{
    public static Event ToDomain(EventDocument doc)
    {
        var config = doc.Config is null ? null : ToConfigDomain(doc.Config);

        return new Event
        {
            Id = doc.Id,
            Title = doc.Title,
            Date = doc.Date,
            Time = doc.Time,
            HostToken = doc.HostToken,
            Slug = doc.Slug,
            CreatorUserId = doc.CreatorUserId,
            CreationRequestId = doc.CreationRequestId,
            Config = config,
            ClosedAt = doc.ClosedAt.HasValue ? new DateTimeOffset(doc.ClosedAt.Value, TimeSpan.Zero) : null,
            Winners = ToWinners(doc),
            WinnerAnnouncedAt = doc.WinnerAnnouncedAt.HasValue
                ? new DateTimeOffset(doc.WinnerAnnouncedAt.Value, TimeSpan.Zero)
                : null,
            WatchlistCleanedAt = doc.WatchlistCleanedAt.HasValue
                ? new DateTimeOffset(doc.WatchlistCleanedAt.Value, TimeSpan.Zero)
                : null,
            Recurrence = ParseRecurrence(doc.Recurrence),
            RecurrenceAnchorDay = doc.RecurrenceAnchorDay,
            RecurrenceParentEventId = doc.RecurrenceParentEventId,
            NextOccurrenceEventId = doc.NextOccurrenceEventId,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero),
            Version = doc.Version,
            WriteSeq = doc.WriteSeq
        };
    }

    public static EventDocument ToDocument(Event evt)
    {
        var config = evt.Config is null ? null : ToConfigDocument(evt.Config);

        return new EventDocument
        {
            Id = evt.Id,
            Title = evt.Title,
            Date = evt.Date,
            Time = evt.Time,
            HostToken = evt.HostToken,
            Slug = evt.Slug,
            CreatorUserId = evt.CreatorUserId,
            CreationRequestId = evt.CreationRequestId,
            Config = config,
            ClosedAt = evt.ClosedAt?.UtcDateTime,
            Winners = evt.Winners
                .Select(w => new EventWinnerDocument
                {
                    MovieId = w.MovieId,
                    PickMethod = ToWinnerPickMethodString(w.Method) ?? "wheel",
                    PickedAt = w.PickedAt.UtcDateTime
                })
                .ToList(),
            WinnerAnnouncedAt = evt.WinnerAnnouncedAt?.UtcDateTime,
            WatchlistCleanedAt = evt.WatchlistCleanedAt?.UtcDateTime,
            Recurrence = ToRecurrenceString(evt.Recurrence),
            RecurrenceAnchorDay = evt.RecurrenceAnchorDay,
            RecurrenceParentEventId = evt.RecurrenceParentEventId,
            NextOccurrenceEventId = evt.NextOccurrenceEventId,
            StartAtUtc = EventSchedule.TryGetStartUtc(evt.Date, evt.Time, out var startAt)
                ? startAt.UtcDateTime
                : null,
            CreatedAt = evt.CreatedAt.UtcDateTime,
            UpdatedAt = evt.UpdatedAt.UtcDateTime,
            Version = evt.Version,
            WriteSeq = evt.WriteSeq
        };
    }

    internal static EventConfig ToConfigDomain(EventConfigDocument doc) => new()
    {
        Theme = doc.Theme,
        ThemeColor = doc.ThemeColor,
        MaxProposalsPerParticipant = doc.MaxProposalsPerParticipant,
        MaxParticipants = doc.MaxParticipants,
        MaxVotesPerParticipant = doc.MaxVotesPerParticipant,
        WheelMode = ParseWheelMode(doc.WheelMode),
        RichSharePreview = doc.RichSharePreview,
        AllowSeries = doc.AllowSeries,
        WinnerCount = doc.WinnerCount ?? EventConfig.DefaultWinnerCount
    };

    internal static EventConfigDocument ToConfigDocument(EventConfig config) => new()
    {
        Theme = config.Theme,
        ThemeColor = config.ThemeColor,
        MaxProposalsPerParticipant = config.MaxProposalsPerParticipant,
        MaxParticipants = config.MaxParticipants,
        MaxVotesPerParticipant = config.MaxVotesPerParticipant,
        WheelMode = ToWheelModeString(config.WheelMode),
        RichSharePreview = config.RichSharePreview,
        AllowSeries = config.AllowSeries,
        WinnerCount = config.WinnerCount
    };

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

    private static List<EventWinner> ToWinners(EventDocument doc) =>
        doc.Winners is { Count: > 0 }
            ? doc.Winners
                .Select(w => new EventWinner
                {
                    MovieId = w.MovieId,
                    Method = ParseWinnerPickMethod(w.PickMethod) ?? WinnerPickMethod.Wheel,
                    PickedAt = new DateTimeOffset(w.PickedAt, TimeSpan.Zero)
                })
                .ToList()
            : [];

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
