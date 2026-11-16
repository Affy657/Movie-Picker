using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public sealed class SetPresenceHandler : ISetPresenceHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly IEventPresenceRepository _presenceRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _clock;
    private readonly EventLiveOptions _options;

    public SetPresenceHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IEventPresenceRepository presenceRepository,
        ICurrentUserAccessor currentUserAccessor,
        TimeProvider clock,
        IOptions<EventLiveOptions> options)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _presenceRepository = presenceRepository;
        _currentUserAccessor = currentUserAccessor;
        _clock = clock;
        _options = options.Value;
    }

    public async Task HandleAsync(string idOrSlug, PresenceRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var userId = _currentUserAccessor.GetUserId();
        var participant = string.IsNullOrEmpty(userId)
            ? null
            : await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);
        if (participant is null)
            throw Errors.ParticipantNotFound();

        var seenUntil = _clock.GetUtcNow() + _options.PresenceTtl;
        await _presenceRepository.SetProposingAsync(
            evt.Id,
            participant.Id,
            seenUntil,
            request.Proposing ? seenUntil : null,
            ct);
    }
}
