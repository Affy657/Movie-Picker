namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IUnsubscribePushHandler
{
    Task HandleAsync(string userId, string endpoint, CancellationToken ct = default);
}
