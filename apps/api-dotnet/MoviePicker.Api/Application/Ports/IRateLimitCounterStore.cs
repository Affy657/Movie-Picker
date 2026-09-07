namespace MoviePicker.Api.Application.Ports;

public interface IRateLimitCounterStore
{
    Task<long> IncrementAsync(string key, DateTimeOffset expiresAt, CancellationToken ct = default);
}
