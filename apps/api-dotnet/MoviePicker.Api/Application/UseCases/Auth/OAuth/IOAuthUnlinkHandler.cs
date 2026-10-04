namespace MoviePicker.Api.Application.UseCases.Auth.OAuth;

public interface IOAuthUnlinkHandler
{
    Task HandleAsync(string userId, string provider, string? currentSessionId, CancellationToken ct = default);
}
