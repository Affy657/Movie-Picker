using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public sealed class AnnounceWheelWinnerHandler : IAnnounceWheelWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IWinnerAnnouncer _winnerAnnouncer;
    private readonly ILogger<AnnounceWheelWinnerHandler> _logger;

    public AnnounceWheelWinnerHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IWinnerAnnouncer winnerAnnouncer,
        ILogger<AnnounceWheelWinnerHandler> logger)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _winnerAnnouncer = winnerAnnouncer;
        _logger = logger;
    }

    public async Task HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        var pending = WheelPicksAwaitingAnnouncement(evt);
        if (pending.Count == 0)
            return;

        var winners = await WinnerMovies.ListAsync(
            _movieRepository,
            evt,
            pending.ConvertAll(pick => pick.MovieId),
            ct);
        if (winners.Count == 0)
            return;

        var now = DateTimeOffset.UtcNow;
        await _eventRepository.UpdateAsync(evt with { WinnerAnnouncedAt = now, UpdatedAt = now }, ct);

        foreach (var winner in winners)
        {
            await _winnerAnnouncer.AnnounceAsync(evt, winner.Title, WinnerPickMethod.Wheel, CancellationToken.None);
            _logger.LogInformation(
                "Wheel winner announced for event {EventId}, winner: {MovieId}", evt.Id, winner.Id);
        }
    }

    private static List<EventWinner> WheelPicksAwaitingAnnouncement(Event evt)
    {
        var announcedUpTo = evt.WinnerAnnouncedAt ?? DateTimeOffset.MinValue;
        return evt.Winners
            .Where(w => w.Method == WinnerPickMethod.Wheel && w.PickedAt > announcedUpTo)
            .OrderBy(w => w.PickedAt)
            .ToList();
    }
}
