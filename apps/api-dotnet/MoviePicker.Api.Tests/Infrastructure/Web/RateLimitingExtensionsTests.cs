using System.Net;
using System.Reflection;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Controllers;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class RateLimitingExtensionsTests
{
    [Fact]
    public void AddMoviePickerRateLimiter_Development_RegistersService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMoviePickerRateLimiter(new StubHostEnvironment("Development"));

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetRequiredService<IOptions<RateLimiterOptions>>());
    }

    [Fact]
    public void AddMoviePickerRateLimiter_Production_RegistersService()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMoviePickerRateLimiter(new StubHostEnvironment("Production"));

        using var provider = services.BuildServiceProvider();
        Assert.NotNull(provider.GetService<IOptions<RateLimiterOptions>>());
        var options = provider.GetRequiredService<IOptions<RateLimiterOptions>>().Value;
        Assert.Equal(StatusCodes.Status429TooManyRequests, options.RejectionStatusCode);
    }

    [Fact]
    public void ClientIpPartitionKey_UsesRemoteIp()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");

        Assert.Equal("203.0.113.10", ClientIpPartitionKey.Get(http));
    }

    [Fact]
    public void ClientIpPartitionKey_Unknown_WhenNoIp()
    {
        Assert.Equal("unknown", ClientIpPartitionKey.Get(new DefaultHttpContext()));
    }

    [Fact]
    public void UserOrIpPartitionKey_PrefersAuthenticatedUser()
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "u-42")],
                    "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Loopback;

        Assert.Equal("user:u-42", UserOrIpPartitionKey.Get(http));
    }

    [Fact]
    public void UserOrIpPartitionKey_FallsBackToIp()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("198.51.100.2");

        Assert.Equal("ip:198.51.100.2", UserOrIpPartitionKey.Get(http));
    }

    [Fact]
    public void CreatePartition_Anonymous_UsesClientAddress()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        var spec = new RateLimitingExtensions.PolicySpec("search-movies", 40, 1);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("ip:192.0.2.8", partition.PartitionKey);
        Assert.NotNull(partition.Factory(partition.PartitionKey));
    }

    [Fact]
    public void CreatePartition_SignedIn_UsesTheAccountWhateverTheAddress()
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "alice")],
                    "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        var spec = new RateLimitingExtensions.PolicySpec(RateLimitingExtensions.VoteMutationPolicy, 120, 1);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("user:alice", partition.PartitionKey);
    }

    [Theory]
    [InlineData(RateLimitingExtensions.AuthLoginPolicy)]
    [InlineData(RateLimitingExtensions.AuthRegisterPolicy)]
    [InlineData(RateLimitingExtensions.AuthPasswordResetRequestPolicy)]
    [InlineData(RateLimitingExtensions.AuthPasswordResetConfirmPolicy)]
    public void CreatePartition_AnonymousFacingPolicy_KeysByAddressEvenWithASession(string policy)
    {
        var http = SignedIn("alice", "192.0.2.8");

        var partition = RateLimitingExtensions.CreatePartition(http, RateLimitingExtensions.FindPolicy(policy)!.Value);

        Assert.Equal("ip:192.0.2.8", partition.PartitionKey);
    }

    [Fact]
    public void GlobalLimiter_ManyAccountsFromOneAddress_ShareTheAddressCeiling()
    {
        using var limiter = RateLimitingExtensions.CreateGlobalLimiter();
        var accepted = Enumerable.Range(0, RateLimitingExtensions.AddressCeilingPerMinute + 1)
            .Count(i =>
            {
                using var lease = limiter.AttemptAcquire(SignedIn($"account-{i}", "203.0.113.9"));
                return lease.IsAcquired;
            });

        Assert.Equal(RateLimitingExtensions.AddressCeilingPerMinute, accepted);
    }

    private static DefaultHttpContext SignedIn(string userId, string address)
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test"))
        };
        http.Connection.RemoteIpAddress = IPAddress.Parse(address);
        return http;
    }

    [Fact]
    public void CreateGlobalPartition_SignedInGuestsOnOneNetwork_GetOnePartitionEach()
    {
        static DefaultHttpContext Guest(string userId)
        {
            var http = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId)], "test"))
            };
            http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
            return http;
        }

        var first = RateLimitingExtensions.CreateGlobalPartition(Guest("u1"));
        var second = RateLimitingExtensions.CreateGlobalPartition(Guest("u2"));

        Assert.NotEqual(first.PartitionKey, second.PartitionKey);
    }

    [Fact]
    public void CreateGlobalPartition_PolledEventView_IsLeftToItsOwnPolicy()
    {
        var polled = WithEndpoint(new EnableRateLimitingAttribute(RateLimitingExtensions.EventViewPollPolicy));
        var action = WithEndpoint(new EnableRateLimitingAttribute(RateLimitingExtensions.VoteMutationPolicy));

        using var pollLimiter = Limiter(RateLimitingExtensions.CreateGlobalPartition(polled));
        using var actionLimiter = Limiter(RateLimitingExtensions.CreateGlobalPartition(action));

        Assert.All(
            Enumerable.Range(0, RateLimitingExtensions.GlobalPermitLimitPerMinute + 1),
            _ => Assert.True(pollLimiter.AttemptAcquire().IsAcquired));
        Assert.Equal(
            RateLimitingExtensions.GlobalPermitLimitPerMinute,
            Enumerable.Range(0, RateLimitingExtensions.GlobalPermitLimitPerMinute + 1).Count(_ => actionLimiter.AttemptAcquire().IsAcquired));
        Assert.NotNull(RateLimitingExtensions.FindPolicy(RateLimitingExtensions.EventViewPollPolicy));
    }

    [Theory]
    [InlineData(typeof(EventsController), nameof(EventsController.GetBySlug))]
    [InlineData(typeof(EventMoviesController), nameof(EventMoviesController.List))]
    public void PolledEventViewRoutes_CountAgainstThePollPolicy(Type controller, string action)
    {
        var attribute = controller.GetMethod(action)!.GetCustomAttribute<EnableRateLimitingAttribute>();

        Assert.Equal(RateLimitingExtensions.EventViewPollPolicy, attribute?.PolicyName);
    }

    private static DefaultHttpContext WithEndpoint(params object[] metadata)
    {
        var http = new DefaultHttpContext();
        http.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(metadata), "test"));
        http.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.7");
        return http;
    }

    private static RateLimiter Limiter(RateLimitPartition<string> partition) => partition.Factory(partition.PartitionKey);

    [Fact]
    public async Task WriteRejectedAsync_SetsStatusAndRetryAfter()
    {
        var http = new DefaultHttpContext();
        http.Response.Body = new MemoryStream();
        var context = new OnRejectedContext
        {
            HttpContext = http,
            Lease = new RetryAfterLease(TimeSpan.FromSeconds(2.4))
        };

        await RateLimitingExtensions.WriteRejectedAsync(context, CancellationToken.None);

        Assert.Equal(StatusCodes.Status429TooManyRequests, http.Response.StatusCode);
        Assert.Equal("3", http.Response.Headers.RetryAfter.ToString());
        Assert.Equal("application/json", http.Response.ContentType);
        http.Response.Body.Position = 0;
        using var reader = new StreamReader(http.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains("\"code\":429", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task WriteRejectedAsync_OmitsRetryAfter_WhenMetadataMissing()
    {
        var http = new DefaultHttpContext();
        http.Response.Body = new MemoryStream();
        var context = new OnRejectedContext
        {
            HttpContext = http,
            Lease = new RetryAfterLease(null)
        };

        await RateLimitingExtensions.WriteRejectedAsync(context, CancellationToken.None);

        Assert.False(http.Response.Headers.ContainsKey("Retry-After"));
    }

    private sealed class RetryAfterLease : RateLimitLease
    {
        private readonly TimeSpan? _retryAfter;

        public RetryAfterLease(TimeSpan? retryAfter) => _retryAfter = retryAfter;

        public override bool IsAcquired => false;

        public override IEnumerable<string> MetadataNames =>
            _retryAfter is null ? [] : [MetadataName.RetryAfter.Name];

        public override bool TryGetMetadata(string key, out object? metadata)
        {
            if (_retryAfter is not null && key == MetadataName.RetryAfter.Name)
            {
                metadata = _retryAfter.Value;
                return true;
            }

            metadata = null;
            return false;
        }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public StubHostEnvironment(string environmentName) => EnvironmentName = environmentName;

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "MoviePicker.Api.Tests";
        public string ContentRootPath { get; set; } = ".";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
