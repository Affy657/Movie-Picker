using System.Net;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class TmdbThrottleHandler : DelegatingHandler
{
    public static readonly TimeSpan DefaultPause = TimeSpan.FromSeconds(1);
    public static readonly TimeSpan LongestPause = TimeSpan.FromSeconds(3);

    private readonly TmdbRequestBudget _budget;
    private readonly Func<TimeSpan, CancellationToken, Task> _pause;

    public TmdbThrottleHandler(TmdbRequestBudget budget)
        : this(budget, static (pause, ct) => Task.Delay(pause, ct))
    {
    }

    public TmdbThrottleHandler(TmdbRequestBudget budget, Func<TimeSpan, CancellationToken, Task> pause)
    {
        _budget = budget;
        _pause = pause;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await SendWithinBudgetAsync(request, cancellationToken).ConfigureAwait(false);
        if (response.StatusCode != HttpStatusCode.TooManyRequests)
            return response;

        var pause = AdvisedPause(response);
        response.Dispose();
        await _pause(pause, cancellationToken).ConfigureAwait(false);
        return await SendWithinBudgetAsync(request, cancellationToken).ConfigureAwait(false);
    }

    private async Task<HttpResponseMessage> SendWithinBudgetAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        using var lease = await _budget.AcquireAsync(cancellationToken).ConfigureAwait(false);
        if (!lease.IsAcquired)
            return new HttpResponseMessage(HttpStatusCode.TooManyRequests) { RequestMessage = request };
        return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
    }

    private static TimeSpan AdvisedPause(HttpResponseMessage response)
    {
        var advised = response.Headers.RetryAfter?.Delta ?? DefaultPause;
        if (advised < TimeSpan.Zero)
            return TimeSpan.Zero;
        return advised > LongestPause ? LongestPause : advised;
    }
}
