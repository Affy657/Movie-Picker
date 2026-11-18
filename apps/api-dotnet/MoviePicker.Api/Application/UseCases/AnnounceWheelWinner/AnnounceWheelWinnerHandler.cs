using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.AnnounceWheelWinner;

public sealed class AnnounceWheelWinnerHandler : IAnnounceWheelWinnerHandler
{
    private readonly IEventRepository _eventRepository;
    private readonly IHostTokenAccessor _hostTokenAccessor;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly IWheelWinnerAnnouncement _announcement;

    public AnnounceWheelWinnerHandler(
        IEventRepository eventRepository,
        IHostTokenAccessor hostTokenAccessor,
        ICurrentUserAccessor currentUserAccessor,
        IWheelWinnerAnnouncement announcement)
    {
        _eventRepository = eventRepository;
        _hostTokenAccessor = hostTokenAccessor;
        _currentUserAccessor = currentUserAccessor;
        _announcement = announcement;
    }

    public async Task HandleAsync(string idOrSlug, CancellationToken ct = default)
    {
        var evt = await HostedEvent.LoadForHostEvenFinishedAsync(
            _eventRepository,
            _hostTokenAccessor,
            _currentUserAccessor.GetUserId(),
            idOrSlug,
            ct);

        await _announcement.AnnounceAwaitingPicksAsync(evt, ct);
    }
}
