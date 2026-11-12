using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class SharedRateLimitFilterTests
{
    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static readonly DateTimeOffset Now = new(2026, 5, 4, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IRateLimitCounterStore> _counters = new();

    private SharedRateLimitFilter CreateFilter(string? environmentName = null) =>
        new(
            _counters.Object,
            new FakeTimeProvider(Now),
            new FakeHostEnvironment { EnvironmentName = environmentName ?? Environments.Production },
            NullLogger<SharedRateLimitFilter>.Instance);

    private static ActionExecutingContext BuildContext(params object[] endpointMetadata)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("203.0.113.7");

        var actionDescriptor = new ActionDescriptor { EndpointMetadata = endpointMetadata };
        var actionContext = new ActionContext(httpContext, new RouteData(), actionDescriptor);

        return new ActionExecutingContext(actionContext, [], new Dictionary<string, object?>(), null!);
    }

    private static (ActionExecutionDelegate Next, Func<bool> WasCalled) TrackedNext()
    {
        var called = false;
        ActionExecutionDelegate next = () =>
        {
            called = true;
            return Task.FromResult<ActionExecutedContext>(null!);
        };
        return (next, () => called);
    }

    private void GivenCounterReturns(long used) =>
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(used);

    [Fact]
    public async Task Development_LetsEverythingThroughWithoutCounting()
    {
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter(Environments.Development).OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        Assert.Null(context.Result);
        _counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task EndpointWithoutTheAttribute_IsNotCounted()
    {
        var context = BuildContext();
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        _counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UnknownPolicyName_IsNotCounted()
    {
        var context = BuildContext(new SharedRateLimitAttribute("politique-inexistante"));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        Assert.Null(context.Result);
        _counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public void Register_IsBoundByAnHourlyQuotaOnTheAddress()
    {
        var attributes = typeof(AuthController)
            .GetMethod(nameof(AuthController.Register))!
            .GetCustomAttributes(typeof(SharedRateLimitAttribute), inherit: false)
            .Cast<SharedRateLimitAttribute>();

        Assert.Contains(attributes, a => a.PolicyName == RateLimitingExtensions.AuthRegisterHourlyPolicy);
        var policy = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.AuthRegisterHourlyPolicy)!.Value;
        Assert.Equal(RateLimitingExtensions.QuotaScope.Address, policy.Scope);
        Assert.Equal(60, policy.WindowMinutes);
    }

    [Theory]
    [InlineData("?section=recommendations&seedTmdbId=603")]
    [InlineData("?section=trending&genreIds=18,35")]
    [InlineData("?section=director&personId=525")]
    [InlineData("?section=collection&collectionId=4242")]
    [InlineData("?section=collection&collectionId=%2B31")]
    [InlineData("?section=collection&collectionId=0x1F")]
    public async Task ShowcaseFreeKeyQuota_OverItsLimit_RefusesAFreeKey(string query)
    {
        var policy = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieShowcaseFreeKeyHourlyPolicy)!.Value;
        _counters
            .Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(policy.PermitLimit + 1);
        var context = BuildContext(new SharedRateLimitAttribute(policy.Name));
        context.HttpContext.Request.QueryString = new QueryString(query);
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.False(wasCalled());
    }

    [Theory]
    [InlineData("?section=trending&genreIds=18")]
    [InlineData("?section=collections")]
    [InlineData("?section=collection&collectionId=1241")]
    public async Task ShowcaseFreeKeyQuota_ClosedSection_IsNeitherCountedNorRefused(string query)
    {
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.MovieShowcaseFreeKeyHourlyPolicy));
        context.HttpContext.Request.QueryString = new QueryString(query);
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        _counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData(nameof(MovieShareDocumentController.GetFilm))]
    [InlineData(nameof(MovieShareDocumentController.GetSeries))]
    public async Task MovieDocument_DistinctMoviesPastTheRouteCeiling_AreRefused(string action)
    {
        var ceiling = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentCeilingPolicy)!.Value;
        var attributes = typeof(MovieShareDocumentController).GetMethod(action)!
            .GetCustomAttributes(typeof(SharedRateLimitAttribute), inherit: false);
        var filter = new SharedRateLimitFilter(
            new InMemoryRateLimitCounterStore(new FakeTimeProvider(Now)),
            new FakeTimeProvider(Now),
            new FakeHostEnvironment { EnvironmentName = Environments.Production },
            NullLogger<SharedRateLimitFilter>.Instance);

        var served = 0;
        for (var tmdbId = 1; tmdbId <= ceiling.PermitLimit + 1; tmdbId++)
        {
            var context = BuildContext(attributes);
            context.HttpContext.Request.RouteValues["slug"] = $"{tmdbId}-x";
            var (next, wasCalled) = TrackedNext();
            await filter.OnActionExecutionAsync(context, next);
            if (wasCalled())
                served++;
        }

        Assert.Equal(ceiling.PermitLimit, served);
    }

    [Fact]
    public async Task MovieDocument_OneMovieUnderTwoTitles_CountsInOneBucket()
    {
        var policy = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.MovieDocumentPolicy)!.Value;
        var filter = new SharedRateLimitFilter(
            new InMemoryRateLimitCounterStore(new FakeTimeProvider(Now)),
            new FakeTimeProvider(Now),
            new FakeHostEnvironment { EnvironmentName = Environments.Production },
            NullLogger<SharedRateLimitFilter>.Instance);

        var served = 0;
        for (var attempt = 0; attempt <= policy.PermitLimit; attempt++)
        {
            var context = BuildContext(new SharedRateLimitAttribute(policy.Name));
            context.HttpContext.Request.RouteValues["slug"] = $"27205-titre-{attempt}";
            var (next, wasCalled) = TrackedNext();
            await filter.OnActionExecutionAsync(context, next);
            if (wasCalled())
                served++;
        }

        Assert.Equal(policy.PermitLimit, served);
    }

    [Fact]
    public async Task SeveralQuotas_OneOverItsLimit_RefusesTheRequest()
    {
        var addressPolicy = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.IdeaSuggestionAddressPolicy)!.Value;
        _counters
            .Setup(c => c.IncrementAsync(
                It.Is<string>(key => key.StartsWith(RateLimitingExtensions.IdeaSuggestionPolicy + "|", StringComparison.Ordinal)),
                It.IsAny<DateTimeOffset>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _counters
            .Setup(c => c.IncrementAsync(
                It.Is<string>(key => key.StartsWith(addressPolicy.Name + "|ip:203.0.113.7|", StringComparison.Ordinal)),
                It.IsAny<DateTimeOffset>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(addressPolicy.PermitLimit + 1);
        var context = BuildContext(
            new SharedRateLimitAttribute(RateLimitingExtensions.IdeaSuggestionPolicy),
            new SharedRateLimitAttribute(addressPolicy.Name));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.False(wasCalled());
        Assert.Equal(StatusCodes.Status429TooManyRequests, Assert.IsType<ContentResult>(context.Result).StatusCode);
    }

    [Fact]
    public async Task SeveralQuotas_AllWithinTheirLimit_LetsTheRequestThroughOnce()
    {
        GivenCounterReturns(1);
        var context = BuildContext(
            new SharedRateLimitAttribute(RateLimitingExtensions.IdeaSuggestionPolicy),
            new SharedRateLimitAttribute(RateLimitingExtensions.IdeaSuggestionAddressPolicy));
        var calls = 0;

        await CreateFilter().OnActionExecutionAsync(context, () =>
        {
            calls++;
            return Task.FromResult<ActionExecutedContext>(null!);
        });

        Assert.Equal(1, calls);
        _counters.Verify(
            c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task UnderTheLimit_LetsTheRequestThrough()
    {
        GivenCounterReturns(1);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task OverTheLimit_Returns429WithRetryAfterAndStopsThePipeline()
    {
        GivenCounterReturns(long.MaxValue);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.False(wasCalled());
        var result = Assert.IsType<ContentResult>(context.Result);
        Assert.Equal(StatusCodes.Status429TooManyRequests, result.StatusCode);
        Assert.Equal("application/json", result.ContentType);

        using var payload = System.Text.Json.JsonDocument.Parse(result.Content!);
        Assert.Equal(
            StatusCodes.Status429TooManyRequests,
            payload.RootElement.GetProperty("code").GetInt32());
        Assert.Equal(ErrorCodes.RateLimited, payload.RootElement.GetProperty("reason").GetString());

        var retryAfter = context.HttpContext.Response.Headers.RetryAfter.ToString();
        Assert.True(int.TryParse(retryAfter, out var seconds));
        Assert.InRange(seconds, 1, 60 * 60 * 24);
    }

    [Fact]
    public async Task CounterUnavailable_FailsOpenInsteadOfBlockingTheUser()
    {
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("base injoignable"));
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task CounterKey_CombinesPolicyPartitionAndWindow()
    {
        string? capturedKey = null;
        DateTimeOffset capturedExpiry = default;
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((string key, DateTimeOffset expiresAt, CancellationToken _) =>
            {
                capturedKey = key;
                capturedExpiry = expiresAt;
            })
            .ReturnsAsync(1);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, _) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.NotNull(capturedKey);
        Assert.StartsWith(RateLimitingExtensions.AuthLoginPolicy + "|", capturedKey);
        Assert.Equal(3, capturedKey!.Split('|').Length);
        Assert.True(capturedExpiry > Now);
    }

    [Fact]
    public async Task CounterKey_AnonymousFacingPolicy_KeysByAddressEvenWithASession()
    {
        string? capturedKey = null;
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((string key, DateTimeOffset _, CancellationToken _) => capturedKey = key)
            .ReturnsAsync(1);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        context.HttpContext.User = new System.Security.Claims.ClaimsPrincipal(new System.Security.Claims.ClaimsIdentity(
            [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "alice")], "test"));
        var (next, _) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.Equal("ip:203.0.113.7", capturedKey!.Split('|')[1]);
    }

    [Fact]
    public async Task TwoRequestsInTheSameWindow_ShareTheSameCounterKey()
    {
        var keys = new List<string>();
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((string key, DateTimeOffset _, CancellationToken __) => keys.Add(key))
            .ReturnsAsync(1);
        var filter = CreateFilter();
        var (next, _) = TrackedNext();

        await filter.OnActionExecutionAsync(
            BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy)), next);
        await filter.OnActionExecutionAsync(
            BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy)), next);

        Assert.Equal(2, keys.Count);
        Assert.Equal(keys[0], keys[1]);
    }

    [Fact]
    public async Task DifferentPolicies_UseDifferentCounters()
    {
        var keys = new List<string>();
        _counters.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((string key, DateTimeOffset _, CancellationToken __) => keys.Add(key))
            .ReturnsAsync(1);
        var filter = CreateFilter();
        var (next, _) = TrackedNext();

        await filter.OnActionExecutionAsync(
            BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy)), next);
        await filter.OnActionExecutionAsync(
            BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.SchedulerPolicy)), next);

        Assert.NotEqual(keys[0], keys[1]);
    }

    [Fact]
    public async Task ExactlyAtTheLimit_IsStillAllowed()
    {
        var policyLimit = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.AuthLoginPolicy)!.Value.PermitLimit;
        GivenCounterReturns(policyLimit);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.True(wasCalled());
        Assert.Null(context.Result);
    }

    [Fact]
    public async Task OnePastTheLimit_IsRefused()
    {
        var policyLimit = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.AuthLoginPolicy)!.Value.PermitLimit;
        GivenCounterReturns(policyLimit + 1);
        var context = BuildContext(new SharedRateLimitAttribute(RateLimitingExtensions.AuthLoginPolicy));
        var (next, wasCalled) = TrackedNext();

        await CreateFilter().OnActionExecutionAsync(context, next);

        Assert.False(wasCalled());
        Assert.IsType<ContentResult>(context.Result);
    }
}
