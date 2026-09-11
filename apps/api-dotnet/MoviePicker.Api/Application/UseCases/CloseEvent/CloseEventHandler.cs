using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.CloseEvent;

public sealed class CloseEventHandler : ICloseEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IMovieRepository _movieRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IWatchlistRepository _watchlistRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IRecurringEventPass _recurringEvents;
    private readonly ILogger<CloseEventHandler> _logger;

    public CloseEventHandler(
        IEventRepository eventRepository,
        IMovieRepository movieRepository,
        IParticipantRepository participantRepository,
        IWatchlistRepository watchlistRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IRecurringEventPass recurringEvents,
        ILogger<CloseEventHandler> logger)
    {
        _eventRepository = eventRepository;
        _movieRepository = movieRepository;
        _participantRepository = participantRepository;
        _watchlistRepository = watchlistRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _recurringEvents = recurringEvents;
        _logger = logger;
    }

    public async Task<CloseEventResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.ClosedAt.HasValue)
        {
            return ToResponse(evt, "Soirée déjà clôturée");
        }

        var now = DateTimeOffset.UtcNow;
        var updated = evt with { ClosedAt = now, UpdatedAt = now };

        var saved = await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Event closed: {EventId}", evt.Id);

        await RemoveWinnerFromParticipantsWatchlistAsync(saved, ct);
        await OpenNextOccurrenceAsync(saved, ct);

        return ToResponse(saved, "Soirée clôturée.");
    }

    private async Task OpenNextOccurrenceAsync(Event evt, CancellationToken ct)
    {
        if (!evt.Recurrence.HasValue || string.IsNullOrEmpty(evt.CreatorUserId))
            return;

        await _recurringEvents.RunForCreatorAsync(evt.CreatorUserId, ct);
    }

    private async Task RemoveWinnerFromParticipantsWatchlistAsync(Event evt, CancellationToken ct)
    {
        if (!evt.HasWinner)
            return;

        try
        {
            var winners = new List<Movie>();
            foreach (var movieId in evt.WinnerMovieIds)
            {
                var winner = await _movieRepository.GetByIdAndEventIdAsync(movieId, evt.Id, ct);
                if (winner is not null)
                    winners.Add(winner);
            }

            if (winners.Count == 0)
                return;

            var participants = await _participantRepository.ListByEventIdAsync(evt.Id, ct);
            var userIds = participants
                .Where(p => !string.IsNullOrEmpty(p.UserId))
                .Select(p => p.UserId!)
                .Distinct()
                .ToList();
            if (userIds.Count == 0)
                return;

            var removed = 0L;
            foreach (var winner in winners)
                removed += await _watchlistRepository.RemoveForUsersAsync(
                    userIds, winner.TmdbId, winner.MediaType, ct);

            if (removed > 0)
                _logger.LogInformation(
                    "Film gagnant retiré de {Count} watchlist(s) à la clôture de la soirée {EventId}", removed, evt.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Échec du retrait du film gagnant des watchlists pour la soirée {EventId}", evt.Id);
        }
    }

    private static CloseEventResponse ToResponse(Event e, string message) => new()
    {
        Id = e.Id,
        Title = e.Title,
        Date = e.Date,
        Time = e.Time,
        Slug = e.Slug,
        Config = EventConfigResponse.FromEvent(e),
        ClosedAt = e.ClosedAt,
        WinnerMovieIds = e.WinnerMovieIds,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        Message = message
    };
}
