using System.Collections.Concurrent;

namespace MoviePicker.Api.Application.Caching;

public sealed class SingleFlight
{
    private readonly ConcurrentDictionary<string, Lazy<Task<object?>>> _inFlight = new();

    public Task<T> RunAsync<T>(string key, Func<Task<T>> load, CancellationToken ct = default)
    {
        var flight = _inFlight.GetOrAdd(key, flightKey => new Lazy<Task<object?>>(() => ExecuteAsync(flightKey, load)));
        return AwaitAsync<T>(flight.Value, ct);
    }

    private async Task<object?> ExecuteAsync<T>(string key, Func<Task<T>> load)
    {
        try
        {
            return await load().ConfigureAwait(false);
        }
        finally
        {
            _inFlight.TryRemove(key, out _);
        }
    }

    private static async Task<T> AwaitAsync<T>(Task<object?> flight, CancellationToken ct) =>
        (T)(await flight.WaitAsync(ct).ConfigureAwait(false))!;
}
