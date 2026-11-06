using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IGetUnreadCountHandler
{
    Task<NotificationUnreadCountResponse> HandleAsync(string userId, CancellationToken ct = default);
}
