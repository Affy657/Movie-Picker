using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.ResetWheel;

public sealed class ResetWheelHandler : IResetWheelHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ILogger<ResetWheelHandler> _logger;
    private readonly TimeProvider _clock;

    public ResetWheelHandler(
        IEventRepository eventRepository,
        ICurrentUserAccessor currentUserAccessor,
        ILogger<ResetWheelHandler> logger,
        TimeProvider clock)
    {
        _eventRepository = eventRepository;
        _currentUserAccessor = currentUserAccessor;
        _logger = logger;
        _clock = clock;
    }

    public async Task<ResetWheelResponse> HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await HostedEvent.LoadForHostAsync(
            _eventRepository,
            _currentUserAccessor.GetUserId(),
            idOrSlug,
            _clock.GetUtcNow(),
            ct);

        if (!evt.HasWinner)
            return new ResetWheelResponse { Message = "No draw to cancel" };

        var now = _clock.GetUtcNow();
        var updated = evt with
        {
            Winners = [],
            UpdatedAt = now
        };
        await _eventRepository.UpdateAsync(updated, ct);
        _logger.LogInformation("Wheel reset for event {EventId}", evt.Id);

        return new ResetWheelResponse { Message = "Draw cancelled" };
    }
}
