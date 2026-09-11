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
    public IReadOnlyList<EventWinner> Winners { get; init; } = [];
    public DateTimeOffset? WinnerAnnouncedAt { get; init; }
    public RecurrenceFrequency? Recurrence { get; init; }
    public string? RecurrenceParentEventId { get; init; }
    public string? NextOccurrenceEventId { get; init; }

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

        if (utcNow >= pendingAt)
            return HasWinner ? EventLifecycle.Finished : EventLifecycle.Pending;

        if (utcNow >= startUtc)
            return EventLifecycle.Live;

        return EventLifecycle.Upcoming;
    }

    public bool IsFinished(DateTimeOffset utcNow) => Lifecycle(utcNow) == EventLifecycle.Finished;

    public bool HasWinner => Winners.Count > 0;

    public IReadOnlyList<string> WinnerMovieIds => Winners.Select(w => w.MovieId).ToList();

    public int TargetWinnerCount => Math.Max(1, Config?.WinnerCount ?? EventConfig.DefaultWinnerCount);

    public int RemainingWinnerSlots => Math.Max(0, TargetWinnerCount - Winners.Count);
}

public sealed record EventConfig
{
    public const int MaxParticipantsCap = 500;

    public const int MaxProposalsPerParticipantCap = 100;

    public const int MaxMoviesPerEventCap = 1000;

    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public WheelMode WheelMode { get; init; } = WheelMode.WeightedByVotes;

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }

    public const int DefaultWinnerCount = 1;

    public const int WinnerCountCap = 10;

    public int WinnerCount { get; init; } = DefaultWinnerCount;
}
