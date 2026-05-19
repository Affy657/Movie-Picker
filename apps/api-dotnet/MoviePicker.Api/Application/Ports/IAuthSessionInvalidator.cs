namespace MoviePicker.Api.Application.Ports;

public interface IAuthSessionInvalidator
{
    Task<long> InvalidateAllForUserAsync(string userId, CancellationToken ct = default);
}
