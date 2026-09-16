using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Persistence;

public sealed class CachedDatabaseHealthProbe : IDatabaseHealthProbe
{
    public static readonly TimeSpan Ttl = TimeSpan.FromSeconds(5);

    private readonly IDatabaseHealthProbe _inner;
    private readonly TimeProvider _clock;
    private readonly object _gate = new();
    private DatabaseProbeResult? _lastResult;
    private DateTimeOffset _lastProbedAt;
    private Task<DatabaseProbeResult>? _inFlight;

    public CachedDatabaseHealthProbe(IDatabaseHealthProbe inner, TimeProvider clock)
    {
        _inner = inner;
        _clock = clock;
    }

    public Task<DatabaseProbeResult> CheckAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            var now = _clock.GetUtcNow();
            if (_lastResult is not null && now - _lastProbedAt < Ttl)
                return Task.FromResult(_lastResult);

            _inFlight ??= ProbeAndRememberAsync();
            return _inFlight.WaitAsync(ct);
        }
    }

    private async Task<DatabaseProbeResult> ProbeAndRememberAsync()
    {
        await Task.Yield();
        try
        {
            var result = await _inner.CheckAsync(CancellationToken.None).ConfigureAwait(false);
            lock (_gate)
            {
                _lastResult = result;
                _lastProbedAt = _clock.GetUtcNow();
            }
            return result;
        }
        finally
        {
            lock (_gate)
            {
                _inFlight = null;
            }
        }
    }
}
