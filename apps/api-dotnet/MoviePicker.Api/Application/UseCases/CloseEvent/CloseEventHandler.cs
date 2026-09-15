using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.FinishedEvents;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.CloseEvent;

public sealed class CloseEventHandler : ICloseEventHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IFinishedEventWatchlistPass _watchlistCleanup;
    private readonly IRecurringEventPass _recurringEvents;
    private readonly ILogger<CloseEventHandler> _logger;
    private readonly TimeProvider _clock;

    public CloseEventHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IFinishedEventWatchlistPass watchlistCleanup,
        IRecurringEventPass recurringEvents,
        ILogger<CloseEventHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _watchlistCleanup = watchlistCleanup;
        _recurringEvents = recurringEvents;
        _logger = logger;
        _clock = clock;
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

        var now = _clock.GetUtcNow();
        var updated = evt with { ClosedAt = now, UpdatedAt = now };

        var saved = await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Event closed: {EventId}", evt.Id);

        await _watchlistCleanup.RunForEventAsync(saved, ct);
        await OpenNextOccurrenceAsync(saved, ct);

        return ToResponse(saved, "Soirée clôturée.");
    }

    private async Task OpenNextOccurrenceAsync(Event evt, CancellationToken ct)
    {
        if (!evt.Recurrence.HasValue || string.IsNullOrEmpty(evt.CreatorUserId))
            return;

        await _recurringEvents.RunForCreatorAsync(evt.CreatorUserId, ct);
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
