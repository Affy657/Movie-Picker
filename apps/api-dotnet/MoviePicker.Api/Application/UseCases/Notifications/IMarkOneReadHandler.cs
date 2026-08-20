namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IMarkOneReadHandler
{
    Task HandleAsync(string userId, string notificationId, CancellationToken ct = default);
}
