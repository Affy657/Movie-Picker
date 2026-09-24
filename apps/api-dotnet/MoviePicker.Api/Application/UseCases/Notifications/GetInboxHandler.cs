using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class GetInboxHandler : IGetInboxHandler
{
    private readonly IUserNotificationRepository _notifications;
    private readonly IUserRepository _users;

    public GetInboxHandler(IUserNotificationRepository notifications, IUserRepository users)
    {
        _notifications = notifications;
        _users = users;
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
        var publicHandles = await ResolvePublicHandlesAsync(items, ct);

        return new NotificationInboxResponse
        {
            Items = items.Select(n => new UserNotificationItem
            {
                Id = n.Id,
                Type = n.Type.ToString().ToLowerInvariant(),
                ActorHandle = n.ActorHandle is { } handle ? publicHandles.GetValueOrDefault(handle) : null,
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

    private async Task<Dictionary<string, string?>> ResolvePublicHandlesAsync(
        IEnumerable<UserNotification> items,
        CancellationToken ct)
    {
        var resolved = new Dictionary<string, string?>(StringComparer.Ordinal);
        foreach (var handle in items.Select(n => n.ActorHandle).OfType<string>().Distinct(StringComparer.Ordinal))
            resolved[handle] = PublicHandleResolver.Resolve(await _users.GetByHandleAsync(handle, ct));
        return resolved;
    }
}
