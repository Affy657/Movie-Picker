using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.LetterboxdImport;

public sealed class SyncLetterboxdWatchlistHandler : ISyncLetterboxdWatchlistHandler
{
    private static readonly TimeSpan MinimumInterval = TimeSpan.FromDays(1);

    private readonly IUserRepository _users;
    private readonly LetterboxdWatchlistSynchronizer _synchronizer;
    private readonly TimeProvider _clock;

    public SyncLetterboxdWatchlistHandler(
        IUserRepository users,
        LetterboxdWatchlistSynchronizer synchronizer,
        TimeProvider clock)
    {
        _users = users;
        _synchronizer = synchronizer;
        _clock = clock;
    }

    public async Task<LetterboxdSyncResponse> HandleAsync(
        string userId,
        bool force,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("Utilisateur introuvable.");

        if (string.IsNullOrWhiteSpace(user.LetterboxdUsername))
        {
            if (!force)
                return Skipped();
            throw new BadRequestException("Aucun pseudo Letterboxd enregistré sur votre compte.");
        }

        var now = _clock.GetUtcNow();
        if (!force && user.LetterboxdLastSyncAt is { } last && now - last < MinimumInterval)
            return Skipped();

        await _users.SetLetterboxdSyncStatusAsync(userId, now, null, ct);

        var outcome = await _synchronizer.SyncAsync(user, ct);
        if (!outcome.Succeeded)
        {
            await _users.SetLetterboxdSyncStatusAsync(userId, now, outcome.Error, ct);
            if (force)
                throw new BadRequestException(outcome.Error ?? "Synchronisation impossible.");
            return Skipped();
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

    private static LetterboxdSyncResponse Skipped() => new() { Skipped = true };
}
