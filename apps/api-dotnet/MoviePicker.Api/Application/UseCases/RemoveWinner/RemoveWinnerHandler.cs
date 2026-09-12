using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.RemoveWinner;

public sealed class RemoveWinnerHandler : IRemoveWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ILogger<RemoveWinnerHandler> _logger;

    public RemoveWinnerHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<RemoveWinnerHandler> logger)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
    }

    public async Task<ResetWheelResponse> HandleAsync(
        string idOrSlug,
        string movieId,
        CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        var token = _hostTokenAccessor.GetHostToken();
        var userId = _currentUserAccessor.GetUserId();
        if (!EventHost.IsHost(evt, token, userId))
            throw new ForbiddenException("Réservé à l'hôte de la soirée");

        if (evt.IsFinished(DateTimeOffset.UtcNow))
            throw new ConflictException("Soirée terminée. Lecture seule.");

        var remaining = evt.Winners.Where(w => w.MovieId != movieId).ToList();
        if (remaining.Count == evt.Winners.Count)
            throw new NotFoundException("Ce film ne fait pas partie des gagnants de la soirée");

        var now = DateTimeOffset.UtcNow;
        await _eventRepository.UpdateAsync(evt with { Winners = remaining, UpdatedAt = now }, ct);
        _logger.LogInformation("Winner {MovieId} removed from event {EventId}", movieId, evt.Id);

        return new ResetWheelResponse { Message = "Film retiré du palmarès." };
    }
}
