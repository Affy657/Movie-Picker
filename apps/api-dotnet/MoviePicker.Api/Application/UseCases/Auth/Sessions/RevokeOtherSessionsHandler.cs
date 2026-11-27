using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.UseCases.Auth.Sessions;

public sealed class RevokeOtherSessionsHandler(IAuthSessionInvalidator sessions) : IRevokeOtherSessionsHandler
{
    private readonly IAuthSessionInvalidator _sessions = sessions;

    public async Task HandleAsync(string userId, string? currentSessionKey, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(currentSessionKey))
            return;
        await _sessions.InvalidateOthersForUserAsync(userId, currentSessionKey, ct);
    }
}
