using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.EventCoHosts;

public sealed class SetEventCoHostHandler : ISetEventCoHostHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IHostTokenAccessor _hostTokens;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _clock;

    public SetEventCoHostHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IHostTokenAccessor hostTokens,
        IUnitOfWork unitOfWork,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _hostTokens = hostTokens;
        _unitOfWork = unitOfWork;
        _clock = clock;
    }

    public async Task HandleAsync(
        string userId,
        string idOrSlug,
        string participantId,
        bool coHost,
        CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);
        if (!HostedEvent.IsCreator(evt, _hostTokens, userId))
            throw Errors.CreatorOnlyCoHosts();

        var now = _clock.GetUtcNow();
        if (coHost && evt.IsFinished(now))
            throw Errors.EventFinished();

        var target = await CoHostTargetAsync(evt, participantId, ct);
        if (ReferenceEquals(Applied(evt, target, coHost), evt))
            return;

        await _unitOfWork.ExecuteAsync(
            async token =>
            {
                await _events.LockForWriteAsync(evt.Id, token);
                var current = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, token);
                var updated = Applied(current, await CoHostTargetAsync(current, participantId, token), coHost);
                if (!ReferenceEquals(updated, current))
                    await _events.UpdateAsync(updated with { UpdatedAt = now }, token);
            },
            ct);
    }

    private async Task<string> CoHostTargetAsync(Event evt, string participantId, CancellationToken ct)
    {
        var participant = await _participants.FindByIdAndEventIdAsync(participantId, evt.Id, ct)
            ?? throw Errors.ParticipantNotFound();
        if (string.IsNullOrEmpty(participant.UserId) || evt.IsCreatedBy(participant.UserId))
            throw Errors.CoHostTargetInvalid();
        return participant.UserId;
    }

    private static Event Applied(Event evt, string userId, bool coHost) =>
        coHost ? evt.WithCoHost(userId) : evt.WithoutCoHost(userId);
}
