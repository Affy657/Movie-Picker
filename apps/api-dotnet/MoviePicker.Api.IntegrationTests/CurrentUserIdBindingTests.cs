using System.Net;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class CurrentUserIdBindingTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public CurrentUserIdBindingTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
    }

    [Theory]
    [InlineData("/api/v1/watchlist")]
    [InlineData("/api/v1/auth/me")]
    [InlineData("/api/v1/lists")]
    public async Task ASignedInIdentityWithoutAnId_IsAnsweredWithTheProblem401OfUnauthorized(string route)
    {
        var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
            services.AddSingleton<IStartupFilter, IdentityWithoutIdStartupFilter>())).CreateClient();

        var res = await client.GetAsync(route);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        Assert.Equal(401, body.RootElement.GetProperty("status").GetInt32());
        Assert.Equal("Unauthorized", body.RootElement.GetProperty("title").GetString());
    }

    private sealed class IdentityWithoutIdStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                context.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "Tester")], "Test"));
                return nextMiddleware(context);
            });
            next(app);
        };
    }
}
