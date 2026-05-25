using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IGetNotificationPreferencesHandler
{
    Task<NotificationPreferencesResponse> HandleAsync(string userId, CancellationToken ct = default);
}
