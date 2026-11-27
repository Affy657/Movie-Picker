using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Auth.Sessions;

public sealed class RevokeSessionHandler(IAuthSessionDirectory sessions) : IRevokeSessionHandler
{
    private readonly IAuthSessionDirectory _sessions = sessions;

    public async Task HandleAsync(string userId, string sessionId, string? currentSessionKey, CancellationToken ct = default)
    {
        var stored = await _sessions.ListActiveForUserAsync(userId, ct);
        var target = stored.FirstOrDefault(s => s.Key != currentSessionKey && SessionPublicId.Of(s.Key) == sessionId)
            ?? throw Errors.SessionNotFound();
        await _sessions.RevokeForUserAsync(userId, target.Key, ct);
    }
}
