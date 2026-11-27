using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.Ports;

public interface IKnownDeviceRepository
{
    Task<KnownDevice?> FindAsync(string userId, string tokenHash, DateTimeOffset now, CancellationToken ct = default);
    Task<bool> AnyForUserAsync(string userId, DateTimeOffset now, CancellationToken ct = default);
    Task<KnownDevice?> TryAddAsync(KnownDevice device, CancellationToken ct = default);
    Task MarkSeenAsync(string deviceId, DateTimeOffset seenAt, CancellationToken ct = default);
    Task<IReadOnlyList<KnownDevice>> ListByUserIdAsync(string userId, CancellationToken ct = default);
    Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default);
}
