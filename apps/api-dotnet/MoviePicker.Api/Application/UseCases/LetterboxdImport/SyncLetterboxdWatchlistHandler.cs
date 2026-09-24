using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class SyncLetterboxdWatchlistHandler : ISyncLetterboxdWatchlistHandler
{
    private static readonly TimeSpan MinimumInterval = TimeSpan.FromDays(1);
    private static readonly TimeSpan RetryIntervalAfterFailure = TimeSpan.FromHours(1);

    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly LetterboxdWatchlistSynchronizer _synchronizer;
    private readonly TimeProvider _clock;

    public SyncLetterboxdWatchlistHandler(
        IUserRepository users,
        IUserNotificationRepository notifications,
        LetterboxdWatchlistSynchronizer synchronizer,
        TimeProvider clock)
    {
        _users = users;
        _notifications = notifications;
        _synchronizer = synchronizer;
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
        var interval = user.LetterboxdLastSyncError is null ? MinimumInterval : RetryIntervalAfterFailure;
        if (!force && user.LetterboxdLastSyncAt is { } last && now - last < interval)
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

        await _users.SetLetterboxdPendingReconciliationCountAsync(userId, outcome.PendingChoices.Count, ct);

        if (!force && outcome.PendingChoices.Count > user.LetterboxdPendingReconciliationCount
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
            Added = outcome.Added,
            Removed = outcome.Removed,
            UnmatchedTitles = outcome.UnmatchedTitles,
            PendingChoices = outcome.PendingChoices,
            TotalOnLetterboxd = outcome.TotalOnLetterboxd,
            TotalTruncated = outcome.TotalTruncated
        };
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

    private static LetterboxdSyncResponse Skipped() => new() { Skipped = true };
}
