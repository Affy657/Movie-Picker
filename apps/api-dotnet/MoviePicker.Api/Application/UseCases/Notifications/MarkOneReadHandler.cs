using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class MarkOneReadHandler : IMarkOneReadHandler
{
    private readonly IUserNotificationRepository _notifications;

    public MarkOneReadHandler(IUserNotificationRepository notifications)
    {
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, string notificationId, CancellationToken ct = default)
    {
        await _notifications.MarkReadAsync(userId, notificationId, ct);
    }
}
