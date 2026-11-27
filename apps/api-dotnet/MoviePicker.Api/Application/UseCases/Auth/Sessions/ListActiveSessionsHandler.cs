using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;

namespace MoviePicker.Api.Application.UseCases.Auth.Sessions;

public sealed class ListActiveSessionsHandler(IAuthSessionDirectory sessions) : IListActiveSessionsHandler
{
    private readonly IAuthSessionDirectory _sessions = sessions;

    public async Task<ActiveSessionListResponse> HandleAsync(string userId, string? currentSessionKey, CancellationToken ct = default)
    {
        var stored = await _sessions.ListActiveForUserAsync(userId, ct);
        var items = stored
            .OrderByDescending(s => s.Key == currentSessionKey)
            .ThenByDescending(s => s.LastSeenAt ?? DateTimeOffset.MinValue)
            .ThenByDescending(s => s.CreatedAt)
            .Select(s => ToResponse(s, s.Key == currentSessionKey))
            .ToList();
        return new ActiveSessionListResponse { Items = items };
    }

    private static ActiveSessionResponse ToResponse(StoredAuthSession session, bool current)
    {
        var device = UserAgentDevice.Parse(session.UserAgent);
        return new ActiveSessionResponse
        {
            Id = SessionPublicId.Of(session.Key),
            Browser = device.Browser,
            OperatingSystem = device.OperatingSystem,
            DeviceKind = device.Kind,
            SignedInAt = session.CreatedAt,
            LastActiveAt = session.LastSeenAt,
            Current = current
        };
    }
}
