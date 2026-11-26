namespace MoviePicker.Api.Domain.Entities;

public sealed record Event
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? RecapSlug { get; init; }

    public string? CreatorUserId { get; init; }
    public string? CreationRequestId { get; init; }

    public EventConfig? Config { get; init; }
    public DateTimeOffset? ClosedAt { get; init; }
    public IReadOnlyList<EventWinner> Winners { get; init; } = [];
    public DateTimeOffset? WinnerAnnouncedAt { get; init; }
    public DateTimeOffset? WatchlistCleanedAt { get; init; }
    public RecurrenceFrequency? Recurrence { get; init; }
    public int? RecurrenceAnchorDay { get; init; }
    public string? RecurrenceParentEventId { get; init; }
    public string? NextOccurrenceEventId { get; init; }
    public string? GroupId { get; init; }
    public IReadOnlyList<string> RemovedUserIds { get; init; } = [];
    public IReadOnlyList<string> CoHostUserIds { get; init; } = [];

    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
    public long Version { get; init; }
    public long WriteSeq { get; init; }

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
            return RemainingWinnerSlots == 0 ? EventLifecycle.Finished : EventLifecycle.Pending;

        if (utcNow >= startUtc)
            return EventLifecycle.Live;

        return EventLifecycle.Upcoming;
    }

    public bool IsFinished(DateTimeOffset utcNow) => Lifecycle(utcNow) == EventLifecycle.Finished;

    public bool IsRatingOpen(DateTimeOffset utcNow) =>
        HasWinner && Lifecycle(utcNow) is not EventLifecycle.Upcoming;

    public bool IsOver(DateTimeOffset utcNow) =>
        Lifecycle(utcNow) is EventLifecycle.Pending or EventLifecycle.Finished;

    public bool HasWinner => Winners.Count > 0;

    public bool HasRemoved(string? userId) =>
        !string.IsNullOrEmpty(userId) && RemovedUserIds.Contains(userId);

    public Event KeepingOut(string userId) =>
        this with { RemovedUserIds = [.. RemovedUserIds.Where(id => id != userId), userId] };

    public Event LettingBackIn(string userId) =>
        this with { RemovedUserIds = [.. RemovedUserIds.Where(id => id != userId)] };

    public bool IsCoHost(string? userId) =>
        !string.IsNullOrEmpty(userId) && CoHostUserIds.Contains(userId);

    public bool IsCreatedBy(string? userId) =>
        !string.IsNullOrEmpty(userId) && userId == CreatorUserId;

    public bool IsHostedBy(string? userId) => IsCreatedBy(userId) || IsCoHost(userId);

    public Event WithCoHost(string userId) =>
        IsCoHost(userId) ? this : this with { CoHostUserIds = [.. CoHostUserIds, userId] };

    public Event WithoutCoHost(string? userId) =>
        IsCoHost(userId) ? this with { CoHostUserIds = [.. CoHostUserIds.Where(id => id != userId)] } : this;

    public bool HasAnonymousProposals => Config?.AnonymousProposals == true;

    public bool ConcealsProposer(string? proposerUserId, string? viewerUserId) =>
        HasAnonymousProposals && (string.IsNullOrEmpty(viewerUserId) || proposerUserId != viewerUserId);

    public IReadOnlyList<string> GetWinnerMovieIds() => Winners.Select(w => w.MovieId).ToList();

    public int TargetWinnerCount => Math.Max(1, Config?.WinnerCount ?? EventConfig.DefaultWinnerCount);

    public int RemainingWinnerSlots => Math.Max(0, TargetWinnerCount - Winners.Count);
}

public sealed record EventConfig
{
    public const int MaxParticipantsCap = 500;

    public const int MaxProposalsPerParticipantCap = 100;

    public const int MaxMoviesPerEventCap = 1000;

    public const int ThemeMaxLength = 100;

    public static readonly EventConfig SavedWithoutSettings = new()
    {
        WheelMode = WheelMode.StrictRandom,
        RichSharePreview = true
    };

    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public int? MaxProposalsPerParticipant { get; init; }

    public int? MaxParticipants { get; init; }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode WheelMode { get; init; } = WheelMode.WeightedByVotes;

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }

    public bool AnonymousProposals { get; init; }

    public const int DefaultWinnerCount = 1;

    public const int WinnerCountCap = 10;

    public int WinnerCount { get; init; } = DefaultWinnerCount;
}
