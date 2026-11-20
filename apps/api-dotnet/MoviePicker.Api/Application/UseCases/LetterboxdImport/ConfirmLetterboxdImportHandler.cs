using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class ConfirmLetterboxdImportHandler : IConfirmLetterboxdImportHandler
{
    private const int MaxSelections = LetterboxdImportLimits.MaxRows;

    private readonly IUserRepository _users;
    private readonly LetterboxdSelectionsWriter _writer;
    private readonly LetterboxdLinkedCounter _linkedCounter;
    private readonly IUsageRecorder _usage;

    public ConfirmLetterboxdImportHandler(
        IUserRepository users,
        LetterboxdSelectionsWriter writer,
        LetterboxdLinkedCounter linkedCounter,
        IUsageRecorder usage)
    {
        _users = users;
        _writer = writer;
        _linkedCounter = linkedCounter;
        _usage = usage;
    }

    public async Task<LetterboxdImportConfirmResponse> HandleAsync(
        string userId,
        LetterboxdImportConfirmRequest request,
        CancellationToken ct = default)
    {
        var watchedSelections = request.WatchedSelections ?? [];
        if (request.Selections.Count > MaxSelections || watchedSelections.Count > MaxSelections)
            throw Errors.TooManySelections(MaxSelections);

        var (added, alreadyPresent) = await _writer.WriteWatchlistAsync(userId, request.Selections, ct);
        var (watchedAdded, watchedAlreadyPresent) = await _writer.WriteWatchedAsync(userId, watchedSelections, ct);

        var pendingCount = request.FromExport == true
            ? await CurrentPendingCountAsync(userId, ct)
            : await PersistPendingCountAsync(
                userId,
                request.Selections.Count + watchedSelections.Count,
                request.RemainingUnresolvedCount,
                ct);
        if (request.Selections.Count + watchedSelections.Count > 0)
            await _linkedCounter.RefreshAsync(userId, ct);
        await _usage.RecordAsync(
            UsageCount.LetterboxdChoicesConfirmed(request.Selections.Count + watchedSelections.Count), ct);

        return new LetterboxdImportConfirmResponse
        {
            Added = added,
            AlreadyPresent = alreadyPresent,
            WatchedAdded = watchedAdded,
            WatchedAlreadyPresent = watchedAlreadyPresent,
            PendingReconciliationCount = pendingCount
        };
    }

    private async Task<int> CurrentPendingCountAsync(string userId, CancellationToken ct) =>
        (await _users.GetByIdAsync(userId, ct) ?? throw Errors.UserNotFound()).LetterboxdPendingReconciliationCount;

    private async Task<int> PersistPendingCountAsync(
        string userId,
        int resolvedCount,
        int? remainingUnresolvedCount,
        CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw Errors.UserNotFound();
        var current = user.LetterboxdPendingReconciliationCount;
        var floor = Math.Max(0, current - resolvedCount);
        var requested = remainingUnresolvedCount is >= 0
            ? remainingUnresolvedCount.Value
            : floor;
        var pendingCount = Math.Min(
            Math.Clamp(requested, floor, current),
            LetterboxdImportLimits.MaxPendingChoices);

        await _users.SetLetterboxdPendingReconciliationCountAsync(userId, pendingCount, ct);
        return pendingCount;
    }
}
