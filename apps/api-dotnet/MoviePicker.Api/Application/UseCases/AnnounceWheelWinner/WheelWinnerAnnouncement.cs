using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public interface IWheelWinnerAnnouncement
{
    Task<int> AnnounceAwaitingPicksAsync(Event evt, CancellationToken ct = default);
}

public sealed class WheelWinnerAnnouncement : IWheelWinnerAnnouncement
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IWinnerAnnouncer _winnerAnnouncer;
    private readonly ILogger<WheelWinnerAnnouncement> _logger;
    private readonly TimeProvider _clock;

    public WheelWinnerAnnouncement(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IWinnerAnnouncer winnerAnnouncer,
        ILogger<WheelWinnerAnnouncement> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _winnerAnnouncer = winnerAnnouncer;
        _logger = logger;
        _clock = clock;
    }

    public static List<EventWinner> PicksAwaitingAnnouncement(Event evt)
    {
        var announcedUpTo = evt.WinnerAnnouncedAt ?? DateTimeOffset.MinValue;
        return evt.Winners
            .Where(w => w.Method == WinnerPickMethod.Wheel && w.PickedAt > announcedUpTo)
            .OrderBy(w => w.PickedAt)
            .ToList();
    }

    public async Task<int> AnnounceAwaitingPicksAsync(Event evt, CancellationToken ct = default)
    {
        var pending = PicksAwaitingAnnouncement(evt);
        if (pending.Count == 0)
            return 0;

        var winners = await WinnerMovies.ListAsync(
            _movieRepository,
            evt,
            pending.ConvertAll(pick => pick.MovieId),
            ct);
        if (winners.Count == 0)
            return 0;

        var now = _clock.GetUtcNow();
        await _eventRepository.UpdateAsync(evt with { WinnerAnnouncedAt = now, UpdatedAt = now }, ct);

        foreach (var winner in winners)
        {
            await _winnerAnnouncer.AnnounceAsync(evt, winner.Title, WinnerPickMethod.Wheel, CancellationToken.None);
            _logger.LogInformation(
                "Wheel winner announced for event {EventId}, winner: {MovieId}", evt.Id, winner.Id);
        }

        return winners.Count;
    }
}
