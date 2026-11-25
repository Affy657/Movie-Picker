using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class SyncLetterboxdWatchlistHandler : ISyncLetterboxdWatchlistHandler
{
    public const string ForcedSyncQuotaScope = "letterboxd-forced-sync";
    public const int MaxForcedSyncsPerHour = 12;

    public static readonly TimeSpan ForcedMinimumInterval = TimeSpan.FromMinutes(5);

    private static readonly TimeSpan MinimumInterval = TimeSpan.FromDays(1);
    private static readonly TimeSpan RetryIntervalAfterFailure = TimeSpan.FromHours(1);
    private static readonly TimeSpan ForcedSyncQuotaWindow = TimeSpan.FromHours(1);

    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly LetterboxdWatchlistSynchronizer _synchronizer;
    private readonly LetterboxdLinkedCounter _linkedCounter;
    private readonly ISharedQuota _quota;
    private readonly IUsageRecorder _usage;
    private readonly TimeProvider _clock;

    public SyncLetterboxdWatchlistHandler(
        IUserRepository users,
        IUserNotificationRepository notifications,
        LetterboxdWatchlistSynchronizer synchronizer,
        LetterboxdLinkedCounter linkedCounter,
        ISharedQuota quota,
        IUsageRecorder usage,
        TimeProvider clock)
    {
        _users = users;
        _notifications = notifications;
        _synchronizer = synchronizer;
        _linkedCounter = linkedCounter;
        _quota = quota;
        _usage = usage;
        _clock = clock;
    }

    public async Task<LetterboxdSyncResponse> HandleAsync(
        string userId,
        bool force,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw Errors.UserNotFound();

        if (string.IsNullOrWhiteSpace(user.LetterboxdUsername))
        {
            if (!force)
                return Skipped();
            throw Errors.LetterboxdUsernameMissing();
        }

        if (!user.LetterboxdSyncWatchlist && !user.LetterboxdSyncWatched)
            return Skipped();

        var now = _clock.GetUtcNow();
        if (IsTooSoon(user, force, now))
            return Skipped();

        if (force && !await _quota.TryConsumeAsync(
            ForcedSyncQuotaScope, userId, MaxForcedSyncsPerHour, ForcedSyncQuotaWindow, ct))
            return Skipped();

        await _users.SetLetterboxdSyncStatusAsync(userId, now, null, ct);

        var outcome = await SyncRecordingFailuresAsync(user, now, ct);
        if (!outcome.Succeeded)
        {
            await _users.SetLetterboxdSyncStatusAsync(userId, now, outcome.Error, ct);
            if (!force)
                return Skipped();
            throw SyncFailure(outcome.Error);
        }

        if (outcome.Error is not null)
            await _users.SetLetterboxdSyncStatusAsync(userId, now, outcome.Error, ct);

        var pendingChoices = outcome.Lists.SelectMany(list => list.PendingChoices).ToList();
        var keptKeys = KeysOfTheUnreadLists(user, outcome);
        var pendingChoiceKeys = pendingChoices
            .Select(LetterboxdPendingChoiceKey.Of)
            .Concat(keptKeys)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var pendingCount = pendingChoices.Count + keptKeys.Count;
        await _users.RecordLetterboxdPendingChoicesAsync(userId, pendingCount, pendingChoiceKeys, ct);
        await _linkedCounter.RefreshAsync(userId, ct);

        if (!force && HasPendingChoiceNotYetReported(user, pendingCount, pendingChoiceKeys)
            && user.NotifiesOn(UserNotificationType.LetterboxdReconciliationPending))
        {
            await _users.RequireAccountAsync(userId, ct);
            await _notifications.AddAsync(new UserNotification
            {
                UserId = userId,
                Type = UserNotificationType.LetterboxdReconciliationPending,
                IsRead = false,
                CreatedAt = now
            }, ct);
        }

        await _usage.RecordAsync(UsageCount.LetterboxdSynced(force), ct);

        return Report(outcome, now);
    }

    private static LetterboxdSyncResponse Report(LetterboxdSyncOutcome outcome, DateTimeOffset syncedAt)
    {
        var watchlist = outcome.Of(LetterboxdImportTarget.Watchlist);
        var watched = outcome.Of(LetterboxdImportTarget.Watched);
        return new LetterboxdSyncResponse
        {
            Skipped = false,
            Error = outcome.Error,
            Lists = outcome.Lists.Select(list => ReportOf(list, syncedAt)).ToList(),
            Added = watchlist.Added,
            Removed = watchlist.Removed,
            UnmatchedTitles = watchlist.UnmatchedTitles,
            PendingChoices = watchlist.PendingChoices,
            TotalOnLetterboxd = watchlist.TotalOnLetterboxd,
            TotalTruncated = watchlist.TotalTruncated,
            WatchedAdded = watched.Added,
            WatchedRemoved = watched.Removed,
            WatchedUnmatchedTitles = watched.UnmatchedTitles,
            WatchedPendingChoices = watched.PendingChoices,
            WatchedTotalOnLetterboxd = watched.TotalOnLetterboxd,
            WatchedTotalTruncated = watched.TotalTruncated
        };
    }

    private static LetterboxdListSyncResponse ReportOf(LetterboxdListOutcome list, DateTimeOffset syncedAt) => new()
    {
        Target = list.Target,
        Added = list.Added,
        Removed = list.Removed,
        UnmatchedTitles = list.UnmatchedTitles,
        PendingChoices = list.PendingChoices,
        TotalOnLetterboxd = list.TotalOnLetterboxd,
        TotalTruncated = list.TotalTruncated,
        Incomplete = list.Incomplete,
        LastSyncAt = list.Synced ? syncedAt : null,
        Error = list.Error
    };

    private static bool IsTooSoon(User user, bool force, DateTimeOffset now) =>
        user.LetterboxdLastSyncAt is { } last && now - last < IntervalFor(user, force);

    private static MoviePickerException SyncFailure(string? error) =>
        error == ErrorCodes.LetterboxdSyncUnavailable
            ? Errors.LetterboxdSyncUnavailable()
            : Errors.LetterboxdSyncFailed(error);

    private static TimeSpan IntervalFor(User user, bool force)
    {
        if (force)
            return ForcedMinimumInterval;
        return user.LetterboxdLastSyncError is null ? MinimumInterval : RetryIntervalAfterFailure;
    }

    private async Task<LetterboxdSyncOutcome> SyncRecordingFailuresAsync(User user, DateTimeOffset startedAt, CancellationToken ct)
    {
        try
        {
            return await _synchronizer.SyncAsync(user, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException || (ex is TaskCanceledException && !ct.IsCancellationRequested))
        {
            return LetterboxdWatchlistSynchronizer.Failed(ErrorCodes.LetterboxdSyncUnavailable);
        }
        catch
        {
            await _users.SetLetterboxdSyncStatusAsync(user.Id, startedAt, ErrorCodes.LetterboxdSyncFailed, CancellationToken.None);
            throw;
        }
    }

    private static List<string> KeysOfTheUnreadLists(User user, LetterboxdSyncOutcome outcome)
    {
        var unread = outcome.Lists.Where(list => list.Incomplete).Select(list => list.Target).ToHashSet();
        return (user.LetterboxdPendingChoiceKeys ?? [])
            .Where(key => unread.Contains(LetterboxdPendingChoiceKey.TargetOf(key)))
            .ToList();
    }

    private static bool HasPendingChoiceNotYetReported(User user, int pendingCount, List<string> pendingChoiceKeys)
    {
        if (user.LetterboxdPendingChoiceKeys is not { } reported)
            return pendingCount > user.LetterboxdPendingReconciliationCount;

        var alreadyReported = reported.ToHashSet(StringComparer.Ordinal);
        return pendingChoiceKeys.Exists(key => !alreadyReported.Contains(key));
    }

    private static LetterboxdSyncResponse Skipped() => new() { Skipped = true };
}
