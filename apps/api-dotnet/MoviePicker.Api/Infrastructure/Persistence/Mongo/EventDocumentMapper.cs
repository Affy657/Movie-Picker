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
            Config = config,
            ClosedAt = doc.ClosedAt.HasValue ? new DateTimeOffset(doc.ClosedAt.Value, TimeSpan.Zero) : null,
            WinnerMovieId = doc.WinnerMovieId,
            WinnerPickMethod = ParseWinnerPickMethod(doc.WinnerPickMethod),
            WinnerPickedAt = doc.WinnerPickedAt.HasValue
                ? new DateTimeOffset(doc.WinnerPickedAt.Value, TimeSpan.Zero)
                : null,
            CreatedAt = new DateTimeOffset(doc.CreatedAt, TimeSpan.Zero),
            UpdatedAt = new DateTimeOffset(doc.UpdatedAt, TimeSpan.Zero)
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
            Config = config,
            ClosedAt = evt.ClosedAt?.UtcDateTime,
            WinnerMovieId = evt.WinnerMovieId,
            WinnerPickMethod = ToWinnerPickMethodString(evt.WinnerPickMethod),
            WinnerPickedAt = evt.WinnerPickedAt?.UtcDateTime,
            CreatedAt = evt.CreatedAt.UtcDateTime,
            UpdatedAt = evt.UpdatedAt.UtcDateTime
        };
    }

    internal static EventConfig ToConfigDomain(EventConfigDocument doc) => new()
    {
        Theme = doc.Theme,
        ThemeColor = doc.ThemeColor,
        MaxProposalsPerParticipant = doc.MaxProposalsPerParticipant,
        MaxParticipants = doc.MaxParticipants,
        WheelMode = ParseWheelMode(doc.WheelMode),
        RichSharePreview = doc.RichSharePreview,
        AllowSeries = doc.AllowSeries
    };

    internal static EventConfigDocument ToConfigDocument(EventConfig config) => new()
    {
        Theme = config.Theme,
        ThemeColor = config.ThemeColor,
        MaxProposalsPerParticipant = config.MaxProposalsPerParticipant,
        MaxParticipants = config.MaxParticipants,
        WheelMode = ToWheelModeString(config.WheelMode),
        RichSharePreview = config.RichSharePreview,
        AllowSeries = config.AllowSeries
    };

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
