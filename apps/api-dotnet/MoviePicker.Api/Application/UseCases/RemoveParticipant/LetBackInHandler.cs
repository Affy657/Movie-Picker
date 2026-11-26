using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;

namespace MoviePicker.Api.Application.UseCases.RemoveParticipant;

public sealed class LetBackInHandler : ILetBackInHandler
{
    private readonly IEventRepository _events;
    private readonly IHostTokenAccessor _hostTokens;
    private readonly ICurrentUserAccessor _currentUser;
    private readonly TimeProvider _clock;

    public LetBackInHandler(
        IEventRepository events,
        IHostTokenAccessor hostTokens,
        ICurrentUserAccessor currentUser,
        TimeProvider clock)
    {
        _events = events;
        _hostTokens = hostTokens;
        _currentUser = currentUser;
        _clock = clock;
    }

    public async Task HandleAsync(string idOrSlug, string userId, CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        var evt = await HostedEvent.LoadForHostAsync(_events, _hostTokens, _currentUser.GetUserId(), idOrSlug, now, ct);
        if (!evt.HasRemoved(userId))
            return;

        await _events.UpdateAsync(evt.LettingBackIn(userId) with { UpdatedAt = now }, ct);
    }
}
