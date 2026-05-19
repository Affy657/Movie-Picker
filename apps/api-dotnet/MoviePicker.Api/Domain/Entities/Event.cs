namespace MoviePicker.Api.Domain.Entities;

public sealed record Event
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string HostToken { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;

    public string? CreatorUserId { get; init; }

    public EventConfig? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public string? WinnerMovieId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

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

public sealed record EventConfig
{
    public const int MaxParticipantsCap = 500;

    public const int MaxProposalsPerParticipantCap = 100;

    public string? Theme { get; init; }
    public DateTimeOffset? EndDate { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public WheelMode WheelMode { get; init; } = WheelMode.StrictRandom;

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }
}
