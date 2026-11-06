using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Web;

public sealed class CounterSharedQuota : ISharedQuota
{
    private const int DigestLength = 32;

    private readonly IRateLimitCounterStore _counters;
    private readonly TimeProvider _clock;
    private readonly bool _isDisabled;
    private readonly ILogger<CounterSharedQuota> _logger;

    public CounterSharedQuota(
        IRateLimitCounterStore counters,
        TimeProvider clock,
        IHostEnvironment environment,
        ILogger<CounterSharedQuota> logger)
    {
        _counters = counters;
        _clock = clock;
        _isDisabled = environment.IsDevelopment();
        _logger = logger;
    }

    public async Task<bool> TryConsumeAsync(string scope, string subject, int limit, TimeSpan window, CancellationToken ct = default)
    {
        if (_isDisabled)
            return true;

        var windowIndex = _clock.GetUtcNow().UtcTicks / window.Ticks;
        var windowEnd = new DateTimeOffset((windowIndex + 1) * window.Ticks, TimeSpan.Zero);
        var key = $"{scope}|{Digest(subject)}|{windowIndex}";

        try
        {
            return await _counters.IncrementAsync(key, windowEnd, ct) <= limit;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Shared quota counter unavailable for {Scope}", scope);
            return true;
        }
    }

    private static string Digest(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)))[..DigestLength];
}
