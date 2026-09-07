using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public enum NotificationDedupChannel
{
    Push = 0,
    InApp = 1
}

public interface INotificationDedupRepository
{
    Task<bool> TryClaimAsync(
        string userId,
        UserNotificationType type,
        string eventId,
        NotificationDedupChannel channel = NotificationDedupChannel.Push,
        CancellationToken ct = default);
}
