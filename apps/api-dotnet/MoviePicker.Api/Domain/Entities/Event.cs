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
    public WinnerPickMethod? WinnerPickMethod { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }

    public EventLifecycle Lifecycle(DateTimeOffset utcNow)
    {
        if (ClosedAt.HasValue)
            return EventLifecycle.Finished;

        if (!EventSchedule.TryGetStartUtc(Date, Time, out var startUtc))
            return EventLifecycle.Upcoming;

        var pendingAt = startUtc + EventSchedule.PendingDelay;
        var autoCloseAt = pendingAt + EventSchedule.AutoCloseDelay;

        if (utcNow >= autoCloseAt)
            return EventLifecycle.Finished;

        var hasWinner = !string.IsNullOrEmpty(WinnerMovieId);

        if (utcNow >= pendingAt)
            return hasWinner ? EventLifecycle.Finished : EventLifecycle.Pending;

        if (utcNow >= startUtc)
            return EventLifecycle.Live;

        return EventLifecycle.Upcoming;
    }

    public bool IsFinished(DateTimeOffset utcNow) => Lifecycle(utcNow) == EventLifecycle.Finished;
}

public sealed record EventConfig
{
    public const int MaxParticipantsCap = 500;

    public const int MaxProposalsPerParticipantCap = 100;

    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public WheelMode WheelMode { get; init; } = WheelMode.WeightedByVotes;

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }
}
