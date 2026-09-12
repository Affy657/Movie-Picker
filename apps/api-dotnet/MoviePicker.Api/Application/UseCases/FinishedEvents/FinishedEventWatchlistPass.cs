using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.FinishedEvents;

public interface IFinishedEventWatchlistPass
{
    Task<bool> RunForEventAsync(Event evt, CancellationToken ct = default);

    Task<int> RunForEventsAsync(IReadOnlyList<Event> events, CancellationToken ct = default);
}

public sealed class FinishedEventWatchlistPass : IFinishedEventWatchlistPass
{
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IParticipantRepository _participants;
    private readonly IWatchlistRepository _watchlists;
    private readonly TimeProvider _clock;
    private readonly ILogger<FinishedEventWatchlistPass> _logger;

    public FinishedEventWatchlistPass(
        IEventRepository events,
        IMovieRepository movies,
        IParticipantRepository participants,
        IWatchlistRepository watchlists,
        TimeProvider clock,
        ILogger<FinishedEventWatchlistPass> logger)
    {
        _events = events;
        _movies = movies;
        _participants = participants;
        _watchlists = watchlists;
        _clock = clock;
        _logger = logger;
    }

    public async Task<int> RunForEventsAsync(IReadOnlyList<Event> events, CancellationToken ct = default)
    {
        var cleaned = 0;
        foreach (var evt in events)
        {
            if (await RunForEventAsync(evt, ct))
                cleaned++;
        }

        return cleaned;
    }

    public async Task<bool> RunForEventAsync(Event evt, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        if (!IsAwaitingCleanup(evt, now))
            return false;

        try
        {
            await RemoveWinnersFromParticipantsWatchlistsAsync(evt, ct);
            await _events.MarkWatchlistCleanedAsync(evt.Id, now, ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Échec du retrait des films gagnants des watchlists pour la soirée {EventId}",
                evt.Id);
            return false;
        }
    }

    private static bool IsAwaitingCleanup(Event evt, DateTimeOffset now) =>
        evt.HasWinner && evt.WatchlistCleanedAt is null && evt.IsFinished(now);

    private async Task RemoveWinnersFromParticipantsWatchlistsAsync(Event evt, CancellationToken ct)
    {
        var winners = await WinnerMovies.ListAsync(_movies, evt, ct);
        if (winners.Count == 0)
            return;

        var participants = await _participants.ListByEventIdAsync(evt.Id, ct);
        var userIds = participants
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .Select(p => p.UserId!)
            .Distinct()
            .ToList();
        if (userIds.Count == 0)
            return;

        var removed = 0L;
        foreach (var winner in winners)
            removed += await _watchlists.RemoveForUsersAsync(userIds, winner.TmdbId, winner.MediaType, ct);

        if (removed > 0)
            _logger.LogInformation(
                "Films gagnants retirés de {Count} watchlist(s) à la fin de la soirée {EventId}",
                removed,
                evt.Id);
    }
}
