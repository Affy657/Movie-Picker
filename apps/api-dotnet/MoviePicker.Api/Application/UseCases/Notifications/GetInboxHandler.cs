using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class GetInboxHandler : IGetInboxHandler
{
    private readonly IUserNotificationRepository _notifications;

    public GetInboxHandler(IUserNotificationRepository notifications)
    {
        _notifications = notifications;
    }

    public async Task<NotificationInboxResponse> HandleAsync(string userId, CancellationToken ct = default)
    {
        var items = await _notifications.ListByUserIdAsync(userId, limit: 50, ct);
        var unreadCount = items.Count(n => !n.IsRead);

        return new NotificationInboxResponse
        {
            Items = items.Select(n => new UserNotificationItem
            {
                Id = n.Id,
                Type = n.Type.ToString().ToLowerInvariant(),
                ActorHandle = n.ActorHandle,
                ActorDisplayName = n.ActorDisplayName,
                ActorAvatarId = n.ActorAvatarId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList(),
            UnreadCount = unreadCount
        };
    }
}
