using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.MovieRatings;

public sealed class MarkRatingPromptedHandler : IMarkRatingPromptedHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly TimeProvider _clock;

    public MarkRatingPromptedHandler(IEventRepository events, IParticipantRepository participants, TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _clock = clock;
    }

    public async Task HandleAsync(string userId, string slug, CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredBySlugAsync(slug, ct);
        var participant = await _participants.FindByEventAndUserIdAsync(evt.Id, userId, ct)
            ?? throw Errors.ParticipantNotFound();

        await _participants.MarkRatingPromptedAsync(participant.Id, evt.Id, _clock.GetUtcNow(), ct);
        await _events.MarkChangedAsync(evt.Id, ct);
    }
}
