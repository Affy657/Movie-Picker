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
    private readonly TimeProvider _clock;

    public RemoveWinnerHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<RemoveWinnerHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
        _clock = clock;
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
            throw Errors.HostOnly();

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.EventFinished();

        var removed = evt.Winners.FirstOrDefault(w => w.MovieId == movieId)
            ?? throw Errors.MovieNotAWinner();
        var remaining = evt.Winners.Where(w => w.MovieId != removed.MovieId).ToList();

        var now = _clock.GetUtcNow();
        await _eventRepository.UpdateAsync(evt with { Winners = remaining, UpdatedAt = now }, ct);
        _logger.LogInformation("Winner {MovieId} removed from event {EventId}", removed.MovieId, evt.Id);

        return new ResetWheelResponse { Message = "Movie removed from the winners" };
    }
}
