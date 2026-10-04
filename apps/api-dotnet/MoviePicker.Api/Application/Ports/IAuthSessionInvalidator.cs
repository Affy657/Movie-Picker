namespace MoviePicker.Api.Application.Ports;

public interface IAuthSessionInvalidator
{
    Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default);
    Task<long> InvalidateOthersForUserAsync(string userId, string? keptSessionId, CancellationToken ct = default);
}
