using System.Net;
using System.Security.Claims;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
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
    public void CreatePartition_ByIp_UsesClientAddress()
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.8");
        var spec = new RateLimitingExtensions.PolicySpec("search-movies", 40, 1, false);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("192.0.2.8", partition.PartitionKey);
        Assert.NotNull(partition.Factory(partition.PartitionKey));
    }

    [Fact]
    public void CreatePartition_ByUser_UsesUserId()
    {
        var http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [new Claim(ClaimTypes.NameIdentifier, "alice")],
                    "test"))
        };
        var spec = new RateLimitingExtensions.PolicySpec(
            RateLimitingExtensions.IdeaSuggestionPolicy,
            10,
            60,
            true);

        var partition = RateLimitingExtensions.CreatePartition(http, spec);

        Assert.Equal("user:alice", partition.PartitionKey);
    }

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
