namespace MoviePicker.Api.Application.UseCases.Auth;

public interface ILogoutHandler
{
    Task HandleAsync(string? userId, string? pushEndpoint, CancellationToken ct = default);
}
