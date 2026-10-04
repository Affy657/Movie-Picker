using Microsoft.Extensions.Caching.Memory;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Application.Caching;

public sealed record CacheLoad<T>(T Value, bool IsComplete)
    where T : class;

public sealed class SharedCacheReadThrough
{
    public static readonly TimeSpan IncompleteLoadTtl = TimeSpan.FromMinutes(2);

    public static readonly TimeSpan DefaultLoadBudget = TimeSpan.FromSeconds(60);

    private readonly IMemoryCache _memory;
    private readonly ISharedCache _shared;
    private readonly SingleFlight _singleFlight;
    private readonly TimeSpan _loadBudget;

    public SharedCacheReadThrough(
        IMemoryCache memory,
        ISharedCache shared,
        SingleFlight singleFlight,
        TimeSpan? loadBudget = null)
    {
        _memory = memory;
        _shared = shared;
        _singleFlight = singleFlight;
        _loadBudget = loadBudget ?? DefaultLoadBudget;
    }

    public Task<T> GetOrLoadAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<T>> load,
        bool shareAcrossInstances = true,
        CancellationToken ct = default)
        where T : class =>
        GetOrLoadCheckedAsync(
            key,
            ttl,
            async token => new CacheLoad<T>(await load(token).ConfigureAwait(false), IsComplete: true),
            shareAcrossInstances,
            ct);

    public async Task<T> GetOrLoadCheckedAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<CacheLoad<T>>> load,
        bool shareAcrossInstances = true,
        CancellationToken ct = default)
        where T : class
    {
        if (_memory.TryGetValue(key, out object? boxed) && boxed is T cached)
            return cached;

        return await _singleFlight
            .RunAsync(key, () => LoadThroughSharedAsync(key, ttl, load, shareAcrossInstances), ct)
            .ConfigureAwait(false);
    }

    public async Task<bool> RefreshAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<CacheLoad<T>>> load,
        CancellationToken ct = default)
        where T : class
    {
        var loaded = await load(ct).ConfigureAwait(false);
        if (!loaded.IsComplete)
            return false;

        await StoreAsync(key, loaded.Value, ttl, shareAcrossInstances: true, CancellationToken.None).ConfigureAwait(false);
        return true;
    }

    private async Task<T> LoadThroughSharedAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<CacheLoad<T>>> load,
        bool shareAcrossInstances)
        where T : class
    {
        using var deadline = new CancellationTokenSource(_loadBudget);
        try
        {
            return await LoadAndStoreAsync(key, ttl, load, shareAcrossInstances, deadline.Token)
                .WaitAsync(deadline.Token)
                .ConfigureAwait(false);
        }
        catch (OperationCanceledException ex) when (deadline.IsCancellationRequested)
        {
            throw new TimeoutException($"Loading {key} took longer than {_loadBudget.TotalSeconds} s", ex);
        }
    }

    private async Task<T> LoadAndStoreAsync<T>(
        string key,
        TimeSpan ttl,
        Func<CancellationToken, Task<CacheLoad<T>>> load,
        bool shareAcrossInstances,
        CancellationToken ct)
        where T : class
    {
        var shared = shareAcrossInstances
            ? await _shared.TryGetAsync<T>(key, ct).ConfigureAwait(false)
            : null;
        if (shared is not null)
        {
            _memory.Set(key, shared.Value, new MemoryCacheEntryOptions { AbsoluteExpiration = shared.ExpiresAt, Size = 1 });
            return shared.Value;
        }

        var loaded = await load(ct).ConfigureAwait(false);
        if (loaded.IsComplete)
            await StoreAsync(key, loaded.Value, ttl, shareAcrossInstances, ct).ConfigureAwait(false);
        else
            _memory.Set(key, loaded.Value, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = ttl < IncompleteLoadTtl ? ttl : IncompleteLoadTtl,
                Size = 1
            });
        return loaded.Value;
    }

    private async Task StoreAsync<T>(string key, T value, TimeSpan ttl, bool shareAcrossInstances, CancellationToken ct)
        where T : class
    {
        _memory.Set(key, value, new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl, Size = 1 });
        if (shareAcrossInstances)
            await _shared.SetAsync(key, value, ttl, ct).ConfigureAwait(false);
    }
}
