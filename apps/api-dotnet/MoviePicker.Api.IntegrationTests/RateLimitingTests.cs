using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class RateLimitingTests
{
    private const string LimitedEnvironment = "Staging";
    private const int LargestListPosters = 1_000;

    private static Task<IHost> StartServerAsync(string environmentName, string policy) =>
        new HostBuilder()
            .ConfigureWebHost(webHost =>
                webHost
                    .UseTestServer()
                    .UseEnvironment(environmentName)
                    .ConfigureServices((context, services) =>
                    {
                        services.AddRouting();
                        services.AddMoviePickerRateLimiter(context.HostingEnvironment);
                    })
                    .Configure(app =>
                    {
                        app.UseRouting();
                        app.UseRateLimiter();
                        app.UseEndpoints(endpoints =>
                        {
                            endpoints.MapGet("/limited", () => "ok").RequireRateLimiting(policy);
                            endpoints.MapGet("/unlimited", () => "ok");
                        });
                    })
            )
            .StartAsync();

    private static Task<IHost> StartRecapDocumentServerAsync() =>
        new HostBuilder()
            .ConfigureWebHost(webHost =>
                webHost
                    .UseTestServer()
                    .UseEnvironment(LimitedEnvironment)
                    .ConfigureServices((context, services) =>
                    {
                        services.AddRouting();
                        services.AddMoviePickerForwardedHeaders();
                        services.AddMoviePickerRateLimiter(context.HostingEnvironment);
                    })
                    .Configure(app =>
                    {
                        app.UseForwardedHeaders();
                        app.UseRouting();
                        app.UseRateLimiter();
                        app.UseEndpoints(endpoints =>
                            endpoints.MapGet("/r/{slug}", () => "ok")
                                .RequireRateLimiting(RateLimitingExtensions.RecapDocumentPolicy));
                    })
            )
            .StartAsync();

    private static async Task<int> ServedRandomRecapsAsync(HttpClient client, string forwardedFor, int attempts)
    {
        var served = 0;
        for (var attempt = 0; attempt < attempts; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"/r/random-{attempt}");
            request.Headers.Add("X-Forwarded-For", forwardedFor);
            using var response = await client.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.OK)
                served++;
        }
        return served;
    }

    [Fact]
    public async Task RecapDocument_CalledDirectly_IsCappedPerAddress_EvenWhenTheClientWritesAHostingAddressFirst()
    {
        using var host = await StartRecapDocumentServerAsync();
        var quota = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.RecapDocumentPolicy)!.Value.PermitLimit;

        var served = await ServedRandomRecapsAsync(host.GetTestClient(), "66.249.93.69, 203.0.113.9", quota + 1);

        Assert.Equal(quota, served);
    }

    [Fact]
    public async Task RecapDocument_RelayedByHosting_IsCountedPerRecapAndNotPerHostingAddress()
    {
        using var host = await StartRecapDocumentServerAsync();
        var quota = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.RecapDocumentPolicy)!.Value.PermitLimit;

        var served = await ServedRandomRecapsAsync(host.GetTestClient(), "203.0.113.9, 66.249.93.69", quota + 1);

        Assert.Equal(quota + 1, served);
    }

    [Fact]
    public async Task GlobalLimiter_CapsARouteWithoutPolicy_PerClient()
    {
        using var host = await StartServerAsync(LimitedEnvironment, RateLimitingExtensions.HealthReadyPolicy);
        var client = host.GetTestClient();

        for (var i = 0; i < RateLimitingExtensions.GlobalPermitLimitPerMinute; i++)
        {
            var ok = await client.GetAsync("/unlimited");
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }

        var rejected = await client.GetAsync("/unlimited");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
    }

    [Fact]
    public async Task PostersPolicy_ServesTheLargestListWhole_AfterTheClientSpentItsGlobalBudget()
    {
        using var host = await StartServerAsync(LimitedEnvironment, RateLimitingExtensions.PostersPolicy);
        var client = host.GetTestClient();
        for (var i = 0; i < RateLimitingExtensions.GlobalPermitLimitPerMinute; i++)
            await client.GetAsync("/unlimited");

        for (var i = 0; i < LargestListPosters; i++)
        {
            var poster = await client.GetAsync("/limited");
            Assert.Equal(HttpStatusCode.OK, poster.StatusCode);
        }
    }

    [Fact]
    public async Task PostersPolicy_StillCapsOneClient_OnItsOwnBudget()
    {
        using var host = await StartServerAsync(LimitedEnvironment, RateLimitingExtensions.PostersPolicy);
        var client = host.GetTestClient();
        var budget = RateLimitingExtensions.FindPolicy(RateLimitingExtensions.PostersPolicy)!.Value.PermitLimit;

        for (var i = 0; i < budget; i++)
        {
            var poster = await client.GetAsync("/limited");
            Assert.Equal(HttpStatusCode.OK, poster.StatusCode);
        }

        var rejected = await client.GetAsync("/limited");
        var other = await client.GetAsync("/unlimited");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.Equal(HttpStatusCode.OK, other.StatusCode);
    }

    [Fact]
    public async Task GlobalLimiter_IsOffInDevelopment()
    {
        using var host = await StartServerAsync(Environments.Development, RateLimitingExtensions.HealthReadyPolicy);
        var client = host.GetTestClient();

        for (var i = 0; i < RateLimitingExtensions.GlobalPermitLimitPerMinute + 5; i++)
        {
            var res = await client.GetAsync("/unlimited");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }

    [Fact]
    public async Task HealthReadyPolicy_Returns429_BeyondItsQuota()
    {
        using var host = await StartServerAsync(LimitedEnvironment, RateLimitingExtensions.HealthReadyPolicy);
        var client = host.GetTestClient();

        for (var i = 0; i < 30; i++)
        {
            var ok = await client.GetAsync("/limited");
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }

        var rejected = await client.GetAsync("/limited");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
    }

    [Fact]
    public async Task Policy_Renvoie429_ApresDepassementDuQuota()
    {
        using var host = await StartServerAsync(
            LimitedEnvironment,
            RateLimitingExtensions.AuthPasswordResetRequestPolicy
        );
        var client = host.GetTestClient();

        for (var i = 0; i < 5; i++)
        {
            var ok = await client.GetAsync("/limited");
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }

        var rejected = await client.GetAsync("/limited");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));

        var body = await rejected.Content.ReadAsStringAsync();
        Assert.Contains("\"code\":429", body);
    }

    [Fact]
    public async Task EnvironnementDevelopment_NeLimiteJamais()
    {
        using var host = await StartServerAsync(
            Environments.Development,
            RateLimitingExtensions.AuthPasswordResetRequestPolicy
        );
        var client = host.GetTestClient();

        for (var i = 0; i < 10; i++)
        {
            var res = await client.GetAsync("/limited");
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }
    }
}
