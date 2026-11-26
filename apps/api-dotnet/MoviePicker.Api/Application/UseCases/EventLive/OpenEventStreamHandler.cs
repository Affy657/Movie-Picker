using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.EventLive;

public sealed class OpenEventStreamHandler : IOpenEventStreamHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IParticipantRepository _participantRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public OpenEventStreamHandler(
        IEventRepository eventRepository,
        IParticipantRepository participantRepository,
        ICurrentUserAccessor currentUserAccessor)
    {
        _eventRepository = eventRepository;
        _participantRepository = participantRepository;
        _currentUserAccessor = currentUserAccessor;
    }

    public async Task<EventStreamAccess> HandleAsync(string slug, CancellationToken ct = default)
    {
        var evt = await _eventRepository.GetRequiredBySlugAsync(slug, ct);
        var userId = _currentUserAccessor.GetUserId();
        var participant = string.IsNullOrEmpty(userId)
            ? null
            : await _participantRepository.FindByEventAndUserIdAsync(evt.Id, userId, ct);

        return new EventStreamAccess(evt.Id, evt.Slug, participant?.Id);
    }
}
