using System.Threading.RateLimiting;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbRequestBudget(RateLimiter limiter) : IDisposable
{
    public const int RequestsPerSecond = 35;
    private const int LongestQueue = 2_000;

    public static TmdbRequestBudget Default() => new(new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
    {
        TokenLimit = RequestsPerSecond,
        TokensPerPeriod = RequestsPerSecond,
        ReplenishmentPeriod = TimeSpan.FromSeconds(1),
        QueueLimit = LongestQueue,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true,
    }));

    public ValueTask<RateLimitLease> AcquireAsync(CancellationToken ct) => limiter.AcquireAsync(1, ct);

    public void Dispose() => limiter.Dispose();
}
