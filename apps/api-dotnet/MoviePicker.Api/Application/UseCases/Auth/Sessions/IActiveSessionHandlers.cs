using MoviePicker.Api.Application.DTOs;

namespace MoviePicker.Api.Application.UseCases.Auth.Sessions;

public interface IListActiveSessionsHandler
{
    Task<ActiveSessionListResponse> HandleAsync(string userId, string? currentSessionKey, CancellationToken ct = default);
}

public interface IRevokeSessionHandler
{
    Task HandleAsync(string userId, string sessionId, string? currentSessionKey, CancellationToken ct = default);
}

public interface IRevokeOtherSessionsHandler
{
    Task HandleAsync(string userId, string? currentSessionKey, CancellationToken ct = default);
}
