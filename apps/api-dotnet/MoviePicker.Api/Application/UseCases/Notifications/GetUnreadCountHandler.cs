using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class GetUnreadCountHandler : IGetUnreadCountHandler
{
    private readonly IUserNotificationRepository _notifications;

    public GetUnreadCountHandler(IUserNotificationRepository notifications)
    {
        _notifications = notifications;
    }

    public async Task<NotificationUnreadCountResponse> HandleAsync(string userId, CancellationToken ct = default) =>
        new() { UnreadCount = await _notifications.GetUnreadCountAsync(userId, ct) };
}
