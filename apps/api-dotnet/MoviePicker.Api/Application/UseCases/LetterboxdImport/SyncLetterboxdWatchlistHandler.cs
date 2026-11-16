using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
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

    private const string WatchedChoiceKeyPrefix = "watched:";

    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly LetterboxdWatchlistSynchronizer _synchronizer;
    private readonly LetterboxdLinkedCounter _linkedCounter;
    private readonly ISharedQuota _quota;
    private readonly TimeProvider _clock;

    public SyncLetterboxdWatchlistHandler(
        IUserRepository users,
        IUserNotificationRepository notifications,
        LetterboxdWatchlistSynchronizer synchronizer,
        LetterboxdLinkedCounter linkedCounter,
        ISharedQuota quota,
        TimeProvider clock)
    {
        _users = users;
        _notifications = notifications;
        _synchronizer = synchronizer;
        _linkedCounter = linkedCounter;
        _quota = quota;
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
        if (user.LetterboxdLastSyncAt is { } last && now - last < IntervalFor(user, force))
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
            if (outcome.Error == ErrorCodes.LetterboxdSyncUnavailable)
                throw Errors.LetterboxdSyncUnavailable();
            throw Errors.LetterboxdSyncFailed(outcome.Error);
        }

        if (outcome.Error is not null)
            await _users.SetLetterboxdSyncStatusAsync(userId, now, outcome.Error, ct);

        var pendingChoices = outcome.PendingChoices.Concat(outcome.WatchedPendingChoices).ToList();
        var keptKeys = KeysOfTheUnreadList(user, outcome.Error);
        var pendingChoiceKeys = pendingChoices
            .Select(PendingChoiceKey)
            .Concat(keptKeys)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        var pendingCount = pendingChoices.Count + keptKeys.Count;
        await _users.RecordLetterboxdPendingChoicesAsync(userId, pendingCount, pendingChoiceKeys, ct);
        await _linkedCounter.RefreshAsync(userId, ct);

        if (!force && HasPendingChoiceNotYetReported(user, pendingCount, pendingChoiceKeys)
            && user.NotifiesOn(UserNotificationType.LetterboxdReconciliationPending))
        {
            await _notifications.AddAsync(new UserNotification
            {
                UserId = userId,
                Type = UserNotificationType.LetterboxdReconciliationPending,
                IsRead = false,
                CreatedAt = now
            }, ct);
        }

        return new LetterboxdSyncResponse
        {
            Skipped = false,
            Error = outcome.Error,
            Added = outcome.Added,
            Removed = outcome.Removed,
            UnmatchedTitles = outcome.UnmatchedTitles,
            PendingChoices = outcome.PendingChoices,
            TotalOnLetterboxd = outcome.TotalOnLetterboxd,
            TotalTruncated = outcome.TotalTruncated,
            WatchedAdded = outcome.WatchedAdded,
            WatchedRemoved = outcome.WatchedRemoved,
            WatchedUnmatchedTitles = outcome.WatchedUnmatchedTitles,
            WatchedPendingChoices = outcome.WatchedPendingChoices,
            WatchedTotalOnLetterboxd = outcome.WatchedTotalOnLetterboxd,
            WatchedTotalTruncated = outcome.WatchedTotalTruncated
        };
    }

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

    private static string PendingChoiceKey(LetterboxdImportRowResponse choice)
    {
        var film = string.IsNullOrEmpty(choice.LetterboxdSlug) ? $"{choice.Title}|{choice.Year}" : choice.LetterboxdSlug;
        return choice.Target == LetterboxdImportTarget.Watched ? WatchedChoiceKeyPrefix + film : film;
    }

    private static List<string> KeysOfTheUnreadList(User user, string? error)
    {
        var reported = user.LetterboxdPendingChoiceKeys ?? [];
        return error switch
        {
            ErrorCodes.LetterboxdWatchedIncomplete => reported.Where(IsWatchedKey).ToList(),
            ErrorCodes.LetterboxdWatchlistIncomplete => reported.Where(key => !IsWatchedKey(key)).ToList(),
            _ => []
        };
    }

    private static bool IsWatchedKey(string key) => key.StartsWith(WatchedChoiceKeyPrefix, StringComparison.Ordinal);

    private static bool HasPendingChoiceNotYetReported(User user, int pendingCount, List<string> pendingChoiceKeys)
    {
        if (user.LetterboxdPendingChoiceKeys is not { } reported)
            return pendingCount > user.LetterboxdPendingReconciliationCount;

        var alreadyReported = reported.ToHashSet(StringComparer.Ordinal);
        return pendingChoiceKeys.Exists(key => !alreadyReported.Contains(key));
    }

    private static LetterboxdSyncResponse Skipped() => new() { Skipped = true };
}
