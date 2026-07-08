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
                            endpoints.MapGet("/limited", () => "ok").RequireRateLimiting(policy)
                        );
                    })
            )
            .StartAsync();

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
