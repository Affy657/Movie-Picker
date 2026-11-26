using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public sealed class AnnounceWheelWinnerHandler : IAnnounceWheelWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IWheelWinnerAnnouncement _announcement;

    public AnnounceWheelWinnerHandler(
        IEventRepository eventRepository,
        ICurrentUserAccessor currentUserAccessor,
        IWheelWinnerAnnouncement announcement)
    {
        _eventRepository = eventRepository;
        _currentUserAccessor = currentUserAccessor;
        _announcement = announcement;
    }

    public async Task HandleAsync(string slug, CancellationToken ct = default)
    {
        var userId = _currentUserAccessor.GetUserId();
        var evt = await HostedEvent.LoadForHostEvenFinishedAsync(
            _eventRepository,
            userId,
            slug,
            ct);

        await _announcement.AnnounceAwaitingPicksAsync(evt, userId, ct);
    }
}
