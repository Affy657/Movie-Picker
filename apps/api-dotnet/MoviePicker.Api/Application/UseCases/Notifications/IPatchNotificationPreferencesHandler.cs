using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IPatchNotificationPreferencesHandler
{
    Task<NotificationPreferencesResponse> HandleAsync(string userId, PatchNotificationPreferencesRequest request, CancellationToken ct = default);
}
