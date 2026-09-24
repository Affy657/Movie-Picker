using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.InviteUser;

public sealed class InviteUserHandler : IInviteUserHandler
{
    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly INotificationDedupRepository _dedup;
    private readonly TimeProvider _clock;

    public InviteUserHandler(
        IEventRepository events,
        IParticipantRepository participants,
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        ICurrentUserAccessor currentUserAccessor,
        INotificationDedupRepository dedup,
        TimeProvider clock)
    {
        _events = events;
        _participants = participants;
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _currentUserAccessor = currentUserAccessor;
        _dedup = dedup;
        _clock = clock;
    }

    public async Task<InviteUserResponse> HandleAsync(string idOrSlug, InviteUserRequest request, CancellationToken ct = default)
    {
        var currentUserId = _currentUserAccessor.GetUserId();
        if (string.IsNullOrEmpty(currentUserId))
            throw Errors.AccountRequired();

        var evt = await _events.GetRequiredByIdOrSlugAsync(idOrSlug, ct);

        if (evt.IsFinished(_clock.GetUtcNow()))
            throw Errors.InviteEventFinished();

        if (evt.CreatorUserId != currentUserId)
            throw Errors.HostOnlyInvite();

        var targetUserId = request.TargetUserId;

        var isFollow = await _follows.IsFollowingAsync(currentUserId, targetUserId, ct);
        if (!isFollow)
            throw Errors.InviteOnlyFollowed();

        var alreadyParticipant = await _participants.FindByEventAndUserIdAsync(evt.Id, targetUserId, ct);
        if (alreadyParticipant is not null)
            throw Errors.AlreadyParticipant();

        var alreadyInvited = await _notifications.ExistsAsync(targetUserId, UserNotificationType.EventInvitation, evt.Id, ct);
        if (alreadyInvited)
            throw Errors.InvitationAlreadySent();

        var claimed = await _dedup.TryClaimAsync(
            targetUserId, UserNotificationType.EventInvitation, evt.Id, NotificationDedupChannel.InApp, ct);
        if (!claimed)
            throw Errors.InvitationAlreadySent();

        User? actor;
        try
        {
            actor = await _users.GetByIdAsync(currentUserId, ct);
            await _notifications.AddAsync(new UserNotification
            {
                UserId = targetUserId,
                Type = UserNotificationType.EventInvitation,
                ActorHandle = actor?.Handle,
                ActorDisplayName = actor?.DisplayName,
                ActorAvatarId = actor?.AvatarId,
                EventId = evt.Id,
                EventSlug = evt.Slug,
                EventTitle = evt.Title,
                IsRead = false,
                CreatedAt = _clock.GetUtcNow()
            }, ct);
        }
        catch (Exception)
        {
            await _dedup.ReleaseAsync(
                targetUserId, UserNotificationType.EventInvitation, evt.Id, NotificationDedupChannel.InApp, CancellationToken.None);
            throw;
        }

        var target = await _users.GetByIdAsync(targetUserId, ct);
        if (target is not null && target.NotifiesOn(UserNotificationType.EventInvitation))
        {
            var subs = await _pushSubscriptions.ListByUserIdAsync(targetUserId, ct);
            var message = new PushMessage(
                Title: "Invitation reçue ! 💌",
                Body: $"{actor?.DisplayName} vous invite à rejoindre {evt.Title}",
                Tag: $"invite-{evt.Id}",
                Url: $"/e/{evt.Slug}"
            );
            await PushFanOut.SendToAllAsync(_pushSender, subs, message, ct);
        }

        return new InviteUserResponse { Message = "Invitation sent" };
    }
}
