using Microsoft.Extensions.Caching.Memory;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.Caching;

public sealed class SharedCacheReadThrough
{
    private readonly IMemoryCache _memory;
    private readonly ISharedCache _shared;
    private readonly SingleFlight _singleFlight;

    public SharedCacheReadThrough(IMemoryCache memory, ISharedCache shared, SingleFlight singleFlight)
    {
        _memory = memory;
        _shared = shared;
        _singleFlight = singleFlight;
    }

    public async Task<T> GetOrLoadAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T>> load,
        CancellationToken ct = default,
        bool shareAcrossInstances = true)
        where T : class
    {
        if (_memory.TryGetValue(key, out object? boxed) && boxed is T cached)
            return cached;

        return await _singleFlight
            .RunAsync(key, () => LoadThroughSharedAsync(key, ttl, load, shareAcrossInstances), ct)
            .ConfigureAwait(false);
    }

    private async Task<T> LoadThroughSharedAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T>> load,
        bool shareAcrossInstances)
        where T : class
    {
        var shared = shareAcrossInstances
            ? await _shared.TryGetAsync<T>(key, CancellationToken.None).ConfigureAwait(false)
            : null;
        if (shared is not null)
        {
            _memory.Set(key, shared.Value, new MemoryCacheEntryOptions { AbsoluteExpiration = shared.ExpiresAt });
            return shared.Value;
        }

        var loaded = await load(CancellationToken.None).ConfigureAwait(false);
        _memory.Set(key, loaded, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });
        if (shareAcrossInstances)
            await _shared.SetAsync(key, loaded, ttl, CancellationToken.None).ConfigureAwait(false);
        return loaded;
    }
}
