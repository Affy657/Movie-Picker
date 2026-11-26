using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Auth;

public sealed record HostHandover(Event Night, string HeirUserId);

public sealed class HostedNightsHandover
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly EventAudienceNotifier _audience;
    private readonly TimeProvider _clock;

    public HostedNightsHandover(
        IEventRepository events,
        IParticipantRepository participants,
        EventAudienceNotifier audience,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _audience = audience;
        _clock = clock;
    }

    public async Task<IReadOnlyList<HostHandover>> HandOverAsync(string leavingUserId, CancellationToken ct)
    {
        var now = _clock.GetUtcNow();
        var handovers = new List<HostHandover>();
        foreach (var night in await _events.ListAllByCreatorUserIdAsync(leavingUserId, ct))
        {
            if (night.IsFinished(now))
                continue;

            var heir = await OldestRemainingParticipantAsync(night.Id, leavingUserId, ct);
            if (heir is null)
            {
                await _events.UpdateAsync(night with { ClosedAt = now, Recurrence = null, UpdatedAt = now }, ct);
                continue;
            }

            var handedOver = await _events.UpdateAsync(
                night.WithoutCoHost(heir) with { CreatorUserId = heir, UpdatedAt = now },
                ct);
            handovers.Add(new HostHandover(handedOver, heir));
        }
        return handovers;
    }

    public async Task AnnounceAsync(IReadOnlyList<HostHandover> handovers)
    {
        foreach (var handover in handovers)
            await _audience.NotifyUsersAsync([handover.HeirUserId], HostRoleMessage(handover.Night), CancellationToken.None);
    }

    private async Task<string?> OldestRemainingParticipantAsync(string eventId, string leavingUserId, CancellationToken ct)
    {
        var participants = await _participants.ListByEventIdAsync(eventId, ct);
        return participants
            .Where(p => !string.IsNullOrEmpty(p.UserId) && p.UserId != leavingUserId)
            .OrderBy(p => p.CreatedAt)
            .ThenBy(p => p.Id, StringComparer.Ordinal)
            .Select(p => p.UserId)
            .FirstOrDefault();
    }

    private static EventAudienceMessage HostRoleMessage(Event night) => new(
        night.Id,
        new UserNotification
        {
            Type = UserNotificationType.HostRoleReceived,
            EventId = night.Id,
            EventSlug = night.Slug,
            EventTitle = night.Title
        },
        ServerCopy.Push.HostRoleReceived(night.Title).ToMessage(
            tag: $"host-role-{night.Id}",
            url: FrontRoutes.EventDetail(night.Slug)));
}
