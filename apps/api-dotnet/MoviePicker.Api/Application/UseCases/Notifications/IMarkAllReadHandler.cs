namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IMarkAllReadHandler
{
    Task HandleAsync(string userId, CancellationToken ct = default);
}
