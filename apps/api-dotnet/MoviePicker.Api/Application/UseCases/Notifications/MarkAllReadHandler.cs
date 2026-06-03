using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public sealed class MarkAllReadHandler : IMarkAllReadHandler
{
    private readonly IUserNotificationRepository _notifications;

    public MarkAllReadHandler(IUserNotificationRepository notifications)
    {
        _notifications = notifications;
    }

    public async Task HandleAsync(string userId, CancellationToken ct = default)
    {
        await _notifications.MarkAllReadAsync(userId, ct);
    }
}
