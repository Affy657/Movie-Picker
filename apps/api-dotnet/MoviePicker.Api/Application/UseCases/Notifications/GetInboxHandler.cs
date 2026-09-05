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

    private const int DefaultPageSize = 30;

    public async Task<NotificationInboxResponse> HandleAsync(
        string userId, int? limit, int? offset, CancellationToken ct = default)
    {
        var pageSize = limit is null ? DefaultPageSize : Math.Clamp(limit.Value, 1, 100);
        var skip = offset is null ? 0 : Math.Max(0, offset.Value);

        var page = await _notifications.ListByUserIdAsync(userId, limit: pageSize + 1, offset: skip, ct);
        var hasMore = page.Count > pageSize;
        var items = hasMore ? page.Take(pageSize).ToList() : page;

        var unreadCount = await _notifications.GetUnreadCountAsync(userId, ct);

        return new NotificationInboxResponse
        {
            Items = items.Select(n => new UserNotificationItem
            {
                Id = n.Id,
                Type = n.Type.ToString().ToLowerInvariant(),
                ActorHandle = n.ActorHandle,
                ActorDisplayName = n.ActorDisplayName,
                ActorAvatarId = n.ActorAvatarId,
                EventSlug = n.EventSlug,
                EventTitle = n.EventTitle,
                MovieTitle = n.MovieTitle,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList(),
            UnreadCount = unreadCount,
            HasMore = hasMore
        };
    }
}
