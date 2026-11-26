using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.InviteUser;

public sealed class InviteUserHandler : IInviteUserHandler
{
    public const string PairQuotaScope = "invite-pair";
    public const int MaxInvitationsPerPairPerDay = 5;

    private static readonly TimeSpan PairQuotaWindow = TimeSpan.FromHours(24);

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly INotificationDedupRepository _dedup;
    private readonly ISharedQuota _quota;
    private readonly TimeProvider _clock;

    public InviteUserHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        INotificationDedupRepository dedup,
        ISharedQuota quota,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _dedup = dedup;
        _quota = quota;
        _clock = clock;
    }

    public async Task<InviteUserResponse> HandleAsync(
        string userId,
        string idOrSlug,
        InviteUserRequest request,
        CancellationToken ct = default)
    {
        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.InviteEventFinished();

        if (!HostedEvent.IsHost(evt, userId))
            throw Errors.HostOnlyInvite();

        var targetUserId = request.TargetUserId;

        var isFollow = await _follows.IsFollowingAsync(userId, targetUserId, ct);
        if (!isFollow)
            throw Errors.InviteOnlyFollowed();

        var alreadyParticipant = await _participants.FindByEventAndUserIdAsync(evt.Id, targetUserId, ct);
        if (alreadyParticipant is not null)
            throw Errors.AlreadyParticipant();

        var lettingBackIn = evt.HasRemoved(targetUserId);
        if (!lettingBackIn && await _notifications.ExistsAsync(targetUserId, UserNotificationType.EventInvitation, evt.Id, ct))
            throw Errors.InvitationAlreadySent();

        var withinPairQuota = await _quota.TryConsumeAsync(
            PairQuotaScope, $"{userId}|{targetUserId}", MaxInvitationsPerPairPerDay, PairQuotaWindow, ct);
        if (!withinPairQuota)
            throw Errors.InvitationLimitReached();

        var target = await _users.GetByIdAsync(targetUserId, ct);

        if (lettingBackIn)
            await LetBackInAsync(evt, targetUserId, ct);

        var claimed = await _dedup.TryClaimAsync(
            targetUserId, UserNotificationType.EventInvitation, evt.Id, NotificationDedupChannel.InApp, ct);
        if (!claimed)
            throw Errors.InvitationAlreadySent();

        var withheld = target is not null && !target.NotifiesOn(UserNotificationType.EventInvitation);

        User? actor;
        try
        {
            actor = await _users.GetByIdAsync(userId, ct);
            await _notifications.AddAsync(new UserNotification
            {
                UserId = targetUserId,
                Type = UserNotificationType.EventInvitation,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                IsRead = false,
                IsWithheld = withheld,
                CreatedAt = _clock.GetUtcNow()
            }.WithActor(actor), ct);
        }
        catch (Exception)
        {
            await _dedup.ReleaseAsync(
                targetUserId, UserNotificationType.EventInvitation, evt.Id, NotificationDedupChannel.InApp, CancellationToken.None);
            throw;
        }

        if (target is not null && !withheld)
        {
            var subs = await _pushSubscriptions.ListByUserIdAsync(targetUserId, ct);
            var message = ServerCopy.Push.EventInvitation(actor?.DisplayName, evt.Title).ToMessage(
                tag: $"invite-{evt.Id}",
                url: FrontRoutes.EventDetail(evt.Slug));
            await PushFanOut.SendToAllAsync(_pushSender, subs, message, ct);
        }

        return Sent();
    }

    private async Task LetBackInAsync(Event evt, string targetUserId, CancellationToken ct)
    {
        await _events.UpdateAsync(evt.LettingBackIn(targetUserId) with { UpdatedAt = _clock.GetUtcNow() }, ct);
        await _dedup.ReleaseAsync(
            targetUserId, UserNotificationType.EventInvitation, evt.Id, NotificationDedupChannel.InApp, ct);
    }

    private static InviteUserResponse Sent() => new() { Message = "Invitation sent" };
}
