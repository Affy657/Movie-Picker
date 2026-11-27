using System.Net;
using System.Net.Http.Headers;
using System.Threading.RateLimiting;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbThrottleHandlerTests
{
    private sealed class ScriptedTmdb(params HttpStatusCode[] answers) : HttpMessageHandler
    {
        private readonly Lock _gate = new();
        private int _calls;
        private int _inFlight;

        public int Calls => _calls;
        public int MostInFlight { get; private set; }
        public TimeSpan? RetryAfter { get; init; }
        public TaskCompletionSource? Hold { get; init; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var call = Interlocked.Increment(ref _calls) - 1;
            var inFlight = Interlocked.Increment(ref _inFlight);
            lock (_gate)
                MostInFlight = Math.Max(MostInFlight, inFlight);
            try
            {
                if (Hold is not null)
                    await Hold.Task.WaitAsync(cancellationToken);
                var response = new HttpResponseMessage(answers[Math.Min(call, answers.Length - 1)]);
                if (RetryAfter is { } delay)
                    response.Headers.RetryAfter = new RetryConditionHeaderValue(delay);
                return response;
            }
            finally
            {
                Interlocked.Decrement(ref _inFlight);
            }
        }
    }

    private static (HttpClient Client, List<TimeSpan> Pauses) ClientOver(ScriptedTmdb tmdb, RateLimiter? limiter = null)
    {
        var pauses = new List<TimeSpan>();
        var budget = new TmdbRequestBudget(limiter ?? new ConcurrencyLimiter(
            new ConcurrencyLimiterOptions { PermitLimit = 100, QueueLimit = 100 }));
        var handler = new TmdbThrottleHandler(budget, (pause, _) =>
        {
            pauses.Add(pause);
            return Task.CompletedTask;
        })
        { InnerHandler = tmdb };
        return (new HttpClient(handler), pauses);
    }

    [Fact]
    public async Task TooManyRequests_IsAskedAgainOnceAfterThePauseTmdbAdvises()
    {
        var tmdb = new ScriptedTmdb(HttpStatusCode.TooManyRequests, HttpStatusCode.OK) { RetryAfter = TimeSpan.FromSeconds(2) };
        var (client, pauses) = ClientOver(tmdb);

        using var response = await client.GetAsync("https://api.themoviedb.org/3/movie/550");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, tmdb.Calls);
        Assert.Equal([TimeSpan.FromSeconds(2)], pauses);
    }

    [Fact]
    public async Task TooManyRequestsTwice_HandsTheSecondRefusalBackInsteadOfInsisting()
    {
        var tmdb = new ScriptedTmdb(HttpStatusCode.TooManyRequests);
        var (client, _) = ClientOver(tmdb);

        using var response = await client.GetAsync("https://api.themoviedb.org/3/movie/550");

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal(2, tmdb.Calls);
    }

    [Fact]
    public async Task TooManyRequestsWithoutAdvice_PausesOneSecond()
    {
        var tmdb = new ScriptedTmdb(HttpStatusCode.TooManyRequests, HttpStatusCode.OK);
        var (client, pauses) = ClientOver(tmdb);

        using var _ = await client.GetAsync("https://api.themoviedb.org/3/movie/550");

        Assert.Equal([TimeSpan.FromSeconds(1)], pauses);
    }

    [Fact]
    public async Task AdvisedPause_IsCappedSoAPageNeverStallsOnIt()
    {
        var tmdb = new ScriptedTmdb(HttpStatusCode.TooManyRequests, HttpStatusCode.OK) { RetryAfter = TimeSpan.FromMinutes(2) };
        var (client, pauses) = ClientOver(tmdb);

        using var _ = await client.GetAsync("https://api.themoviedb.org/3/movie/550");

        Assert.Equal([TmdbThrottleHandler.LongestPause], pauses);
    }

    [Fact]
    public async Task OtherAnswers_PassThroughWithoutASecondCall()
    {
        var tmdb = new ScriptedTmdb(HttpStatusCode.NotFound);
        var (client, pauses) = ClientOver(tmdb);

        using var response = await client.GetAsync("https://api.themoviedb.org/3/movie/550");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(1, tmdb.Calls);
        Assert.Empty(pauses);
    }

    [Fact]
    public async Task Requests_WaitForTheirShareOfTheBudgetBeforeLeaving()
    {
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var tmdb = new ScriptedTmdb(HttpStatusCode.OK) { Hold = release };
        var (client, _) = ClientOver(tmdb, new ConcurrencyLimiter(new ConcurrencyLimiterOptions { PermitLimit = 2, QueueLimit = 10 }));

        var calls = Enumerable.Range(0, 6).Select(_ => client.GetAsync("https://api.themoviedb.org/3/movie/550")).ToList();
        await Task.Delay(50);
        release.SetResult();
        foreach (var response in await Task.WhenAll(calls))
            response.Dispose();

        Assert.Equal(6, tmdb.Calls);
        Assert.Equal(2, tmdb.MostInFlight);
    }

    [Fact]
    public async Task DefaultBudget_LetsABurstLeaveUpToItsRateAndQueuesTheRest()
    {
        using var budget = TmdbRequestBudget.Default();

        var leases = Enumerable.Range(0, TmdbRequestBudget.RequestsPerSecond + 1)
            .Select(_ => budget.AcquireAsync(CancellationToken.None))
            .ToList();

        Assert.All(leases.Take(TmdbRequestBudget.RequestsPerSecond), lease => Assert.True(lease.IsCompleted));
        Assert.False(leases[^1].IsCompleted);
        using var queued = await leases[^1];
        Assert.True(queued.IsAcquired);
        foreach (var lease in leases.Take(TmdbRequestBudget.RequestsPerSecond))
            (await lease).Dispose();
    }
}
