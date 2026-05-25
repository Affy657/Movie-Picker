using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface ISubscribePushHandler
{
    Task HandleAsync(string userId, SubscribePushRequest request, CancellationToken ct = default);
}
