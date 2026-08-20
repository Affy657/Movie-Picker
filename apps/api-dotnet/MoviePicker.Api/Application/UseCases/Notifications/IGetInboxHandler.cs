using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IGetInboxHandler
{
    Task<NotificationInboxResponse> HandleAsync(string userId, int? limit, int? offset, CancellationToken ct = default);
}
