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
    private readonly TimeProvider _clock;
    private readonly EventLiveOptions _options;

    public SetPresenceHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        IEventPresenceRepository presenceRepository,
        TimeProvider clock,
        IOptions<EventLiveOptions> options)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _presenceRepository = presenceRepository;
        _clock = clock;
        _options = options.Value;
    }

    public async Task HandleAsync(string userId, string idOrSlug, PresenceRequest request, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        var participant = await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct)
            ?? throw Errors.ParticipantNotFound();

        var seenUntil = _clock.GetUtcNow() + _options.PresenceTtl;
        await _presenceRepository.SetProposingAsync(
            evt.Id,
            participant.Id,
            seenUntil,
            request.Proposing && !evt.HasAnonymousProposals ? seenUntil : null,
            ct);
    }
}
