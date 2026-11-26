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

        var now = _clock.GetUtcNow();
        var due = LetterboxdListStatus.EnabledListsOf(user).Where(list => IsDue(user, list, force, now)).ToList();
        if (due.Count == 0)
            return Skipped();

        if (force && !await _quota.TryConsumeAsync(
            ForcedSyncQuotaScope, userId, MaxForcedSyncsPerHour, ForcedSyncQuotaWindow, ct))
            return Skipped();

        await StampAsync(user, now, due, _ => null, ct);

        var outcome = await SyncRecordingFailuresAsync(user, due, now, ct);
        if (!outcome.Succeeded)
        {
            await StampAsync(user, now, due, list => ErrorOf(outcome, list), ct);
            if (!force)
                return Skipped();
            throw SyncFailure(outcome.Error);
        }

        if (outcome.Error is not null)
            await StampAsync(user, now, due, list => ErrorOf(outcome, list), ct);

        var pendingChoices = outcome.Lists.SelectMany(list => list.PendingChoices).ToList();
        var keptKeys = KeysOfTheListsNotRead(user, outcome);
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

        return Report(user, outcome, now);
    }

    private Task StampAsync(
        User user,
        DateTimeOffset at,
        IReadOnlyList<LetterboxdImportTarget> lists,
        Func<LetterboxdImportTarget, string?> errorOf,
        CancellationToken ct)
    {
        var stamped = LetterboxdListStatus.FollowingTheSharedStatus(user);
        foreach (var list in lists)
            stamped[list] = new LetterboxdListSync(at, errorOf(list));
        return _users.SetLetterboxdSyncStatusAsync(
            user.Id,
            at,
            LetterboxdListStatus.SharedErrorAfter(user, stamped),
            stamped,
            ct);
    }

    private static string? ErrorOf(LetterboxdSyncOutcome outcome, LetterboxdImportTarget list) =>
        outcome.Lists.Count == 0 ? outcome.Error : outcome.Of(list).Error;

    private static LetterboxdSyncResponse Report(User user, LetterboxdSyncOutcome outcome, DateTimeOffset syncedAt)
    {
        var watchlist = outcome.Of(LetterboxdImportTarget.Watchlist);
        var watched = outcome.Of(LetterboxdImportTarget.Watched);
        return new LetterboxdSyncResponse
        {
            Skipped = false,
            Error = outcome.Error,
            Lists = outcome.Lists.Select(list => ReportOf(user, list, syncedAt)).ToList(),
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

    private static LetterboxdListSyncResponse ReportOf(User user, LetterboxdListOutcome list, DateTimeOffset syncedAt)
    {
        var stored = list.Synced ? new LetterboxdListSync(syncedAt, list.Error) : LetterboxdListStatus.Of(user, list.Target);
        return new LetterboxdListSyncResponse
        {
            Target = list.Target,
            Added = list.Added,
            Removed = list.Removed,
            UnmatchedTitles = list.UnmatchedTitles,
            PendingChoices = list.PendingChoices,
            TotalOnLetterboxd = list.TotalOnLetterboxd,
            TotalTruncated = list.TotalTruncated,
            Incomplete = list.Incomplete,
            LastSyncAt = stored?.At,
            Error = stored?.Error
        };
    }

    private static bool IsDue(User user, LetterboxdImportTarget list, bool force, DateTimeOffset now) =>
        LetterboxdListStatus.Of(user, list) is not { } last || now - last.At >= IntervalFor(last, force);

    private static MoviePickerException SyncFailure(string? error) =>
        error == ErrorCodes.LetterboxdSyncUnavailable
            ? Errors.LetterboxdSyncUnavailable()
            : Errors.LetterboxdSyncFailed(error);

    private static TimeSpan IntervalFor(LetterboxdListSync last, bool force)
    {
        if (force)
            return ForcedMinimumInterval;
        return last.Error is null ? MinimumInterval : RetryIntervalAfterFailure;
    }

    private async Task<LetterboxdSyncOutcome> SyncRecordingFailuresAsync(
        User user,
        IReadOnlyList<LetterboxdImportTarget> due,
        DateTimeOffset startedAt,
        CancellationToken ct)
    {
        try
        {
            return await _synchronizer.SyncAsync(user, due, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException || (ex is TaskCanceledException && !ct.IsCancellationRequested))
        {
            return LetterboxdWatchlistSynchronizer.Failed(ErrorCodes.LetterboxdSyncUnavailable);
        }
        catch
        {
            await StampAsync(user, startedAt, due, _ => ErrorCodes.LetterboxdSyncFailed, CancellationToken.None);
            throw;
        }
    }

    private static List<string> KeysOfTheListsNotRead(User user, LetterboxdSyncOutcome outcome)
    {
        var read = outcome.Lists
            .Where(list => list.Synced && !list.Incomplete)
            .Select(list => list.Target)
            .ToHashSet();
        var notRead = LetterboxdListStatus.EnabledListsOf(user).Where(list => !read.Contains(list)).ToHashSet();
        return (user.LetterboxdPendingChoiceKeys ?? [])
            .Where(key => notRead.Contains(LetterboxdPendingChoiceKey.TargetOf(key)))
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
