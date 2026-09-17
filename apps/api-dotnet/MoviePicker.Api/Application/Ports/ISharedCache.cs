namespace MoviePicker.Api.Application.Ports;

public sealed record SharedCacheEntry<T>(T Value, DateTimeOffset ExpiresAt);

public interface ISharedCache
{
    Task<SharedCacheEntry<T>?> TryGetAsync<T>(string key, CancellationToken ct = default);

    Task<IReadOnlyDictionary<string, SharedCacheEntry<T>>> TryGetManyAsync<T>(
        IReadOnlyCollection<string> keys,
        CancellationToken ct = default);

    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default);
}
