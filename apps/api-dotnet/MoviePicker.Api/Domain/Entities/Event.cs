namespace MoviePicker.Api.Domain.Entities;

public sealed record Event
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Date { get; init; } = string.Empty;
    public string Time { get; init; } = string.Empty;
    public string HostToken { get; init; } = string.Empty;
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

        var scheduledEndAt = startUtc + NightLength;
        var autoCloseAt = startUtc + EventSchedule.PendingDelay + EventSchedule.AutoCloseDelay;

        if (utcNow >= autoCloseAt)
            return EventLifecycle.Finished;

        if (utcNow >= scheduledEndAt)
            return RemainingWinnerSlots == 0 ? EventLifecycle.Finished : EventLifecycle.Pending;

        if (utcNow >= startUtc)
            return EventLifecycle.Live;

        return EventLifecycle.Upcoming;
    }

    public TimeSpan NightLength => EventSchedule.NightLength(Winners.Max(w => w.RuntimeMinutes));

    public bool TryGetEndUtc(out DateTimeOffset endUtc)
    {
        DateTimeOffset? end = null;
        if (EventSchedule.TryGetStartUtc(Date, Time, out var startUtc))
        {
            var scheduledEndAt = startUtc + NightLength;
            var lastPickedAt = Winners.Count == 0 ? scheduledEndAt : Winners.Max(w => w.PickedAt);
            end = lastPickedAt > scheduledEndAt ? lastPickedAt : scheduledEndAt;
        }

        if (ClosedAt is { } closedAt && (end is null || closedAt < end))
            end = closedAt;

        endUtc = end ?? default;
        return end.HasValue;
    }

    public bool HasEndedWithinTheCatchUpWindow(DateTimeOffset utcNow) =>
        HasWinner
        && TryGetEndUtc(out var endUtc)
        && utcNow >= endUtc
        && utcNow - EventSchedule.RatingCatchUpWindow < endUtc;

    public bool IsRatingPromptDue(DateTimeOffset utcNow, DateTimeOffset? promptedAt) =>
        HasEndedWithinTheCatchUpWindow(utcNow)
        && TryGetEndUtc(out var endUtc)
        && (promptedAt is null || promptedAt < endUtc);

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

    public Movie HideProposalTime(Movie movie) =>
        HasAnonymousProposals ? movie with { CreatedAt = CreatedAt, UpdatedAt = CreatedAt } : movie;

    public IReadOnlyList<Movie> InListOrder(IReadOnlyList<Movie> movies) =>
        HasAnonymousProposals ? [.. movies.OrderBy(movie => movie.Id, StringComparer.Ordinal)] : movies;

    public IReadOnlyList<string> GetWinnerMovieIds() => Winners.Select(w => w.MovieId).ToList();

    public int TargetWinnerCount => Math.Max(1, Config?.WinnerCount ?? EventConfig.DefaultWinnerCount);

    public int RemainingWinnerSlots => Math.Max(0, TargetWinnerCount - Winners.Count);
}

public sealed record EventConfig
{
    public const int MaxParticipantsCap = 50;

    public const int MaxProposalsPerParticipantCap = 15;

    public const int MaxMoviesPerEventCap = 1000;

    public const int ThemeMaxLength = 100;

    public static readonly EventConfig SavedWithoutSettings = new()
    {
        WheelMode = WheelMode.StrictRandom,
        RichSharePreview = true
    };

    private readonly int? _maxProposalsPerParticipant;
    private readonly int? _maxParticipants;

    public string? Theme { get; init; }
    public int? ThemeColor { get; init; }
    public int? MaxProposalsPerParticipant
    {
        get => _maxProposalsPerParticipant;
        init => _maxProposalsPerParticipant = AtMost(value, MaxProposalsPerParticipantCap);
    }

    public int? MaxParticipants
    {
        get => _maxParticipants;
        init => _maxParticipants = AtMost(value, MaxParticipantsCap);
    }

    public int? MaxVotesPerParticipant { get; init; }

    public WheelMode WheelMode { get; init; } = WheelMode.WeightedByVotes;

    public bool RichSharePreview { get; init; }

    public bool AllowSeries { get; init; }

    public bool AnonymousProposals { get; init; }

    public const int DefaultWinnerCount = 1;

    public const int WinnerCountCap = 10;

    public int WinnerCount { get; init; } = DefaultWinnerCount;

    private static int? AtMost(int? value, int cap) => value > cap ? cap : value;
}
