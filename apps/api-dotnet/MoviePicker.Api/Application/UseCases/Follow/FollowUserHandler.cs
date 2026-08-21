using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Follow;

public sealed class FollowUserHandler : IFollowUserHandler
{
    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IUserNotificationRepository _notifications;
    private readonly IPushSubscriptionRepository _pushSubscriptions;
    private readonly IPushNotificationSender _pushSender;
    private readonly TimeProvider _clock;

    public FollowUserHandler(
        IFollowRepository follows,
        IUserRepository users,
        IUserNotificationRepository notifications,
        IPushSubscriptionRepository pushSubscriptions,
        IPushNotificationSender pushSender,
        TimeProvider clock)
    {
        _follows = follows;
        _users = users;
        _notifications = notifications;
        _pushSubscriptions = pushSubscriptions;
        _pushSender = pushSender;
        _clock = clock;
    }

    public async Task HandleAsync(string currentUserId, string targetHandle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(targetHandle);
        var target = await _users.GetByHandleAsync(normalized, ct)
            ?? throw new NotFoundException("Profil introuvable");

        if (target.Id == currentUserId)
            throw new BadRequestException("Vous ne pouvez pas vous suivre vous-même.");

        if (!target.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var isNewFollow = await _follows.FollowAsync(currentUserId, target.Id, ct);
        if (!isNewFollow)
            return;

        var follower = await _users.GetByIdAsync(currentUserId, ct);
        if (follower is null)
            return;

        if (!target.NotifiesOn(UserNotificationType.NewFollower))
            return;

        var notification = new UserNotification
        {
            UserId = target.Id,
            Type = UserNotificationType.NewFollower,
            ActorHandle = follower.Handle,
            ActorDisplayName = follower.DisplayName,
            ActorAvatarId = follower.AvatarId,
            IsRead = false,
            CreatedAt = _clock.GetUtcNow()
        };
        await _notifications.AddAsync(notification, ct);

        var subs = await _pushSubscriptions.ListByUserIdAsync(target.Id, ct);
        var message = new PushMessage(
            Title: "Nouveau follower 👀",
            Body: $"{follower.DisplayName} a commencé à vous suivre.",
            Tag: "new-follower",
            Url: $"/u/{follower.Handle}");
        foreach (var sub in subs)
            await _pushSender.SendAsync(sub, message, ct);
    }
}
