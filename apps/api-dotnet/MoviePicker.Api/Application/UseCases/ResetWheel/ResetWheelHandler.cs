using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.ResetWheel;

public sealed class ResetWheelHandler : IResetWheelHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ILogger<ResetWheelHandler> _logger;
    private readonly TimeProvider _clock;

    public ResetWheelHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<ResetWheelHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
        _clock = clock;
    }

    public async Task<ResetWheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        if (!evt.HasWinner)
            return new ResetWheelResponse { Message = "Aucun tirage à annuler." };

        var now = _clock.GetUtcNow();
        var updated = evt with
        {
            Winners = [],
            UpdatedAt = now
        };
        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Wheel reset for event {EventId}", evt.Id);

        return new ResetWheelResponse { Message = "Tirage annulé." };
    }
}
