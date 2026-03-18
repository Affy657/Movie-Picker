namespace MoviePicker.Api.Domain.Entities;

public sealed class Event
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;   // YYYY-MM-DD
    public string Time { get; init; } = string.Empty;  // HH:mm
    public string HostToken { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public EventConfig? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    /// <summary>
    /// Terminé si clôturé, ou si date/heure de fin (event ou config.endDate) dépassée.
    /// </summary>
    public bool IsFinished(DateTimeOffset utcNow)
    {
        if (ClosedAt.HasValue)
            return true;

        if (Config?.EndDate is { } endDate)
            return utcNow >= endDate;

        if (DateTimeOffset.TryParse($"{Date}T{Time}:00Z", null, System.Globalization.DateTimeStyles.AssumeUniversal, out var end))
            return utcNow >= end;

        return false;
    }
}

public sealed class EventConfig
{
    public string? Theme { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }
}
