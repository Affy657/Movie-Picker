using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ErrorContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private sealed class FlakyTicketStore : ITicketStore
    {
        private readonly MemoryAuthTicketStore _inner = new();

        public bool FailRetrieve { get; set; }

        public Task<string> StoreAsync(AuthenticationTicket ticket) => _inner.StoreAsync(ticket);

        public Task RenewAsync(string key, AuthenticationTicket ticket) => _inner.RenewAsync(key, ticket);

        public Task<AuthenticationTicket?> RetrieveAsync(string key) =>
            FailRetrieve ? throw new InvalidOperationException("session store unreachable") : _inner.RetrieveAsync(key);

        public Task RemoveAsync(string key) => _inner.RemoveAsync(key);
    }

    private readonly MoviePickerApplicationFactory _factory;

    public ErrorContractTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<JsonElement> ReadErrorAsync(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.Clone();

    [Fact]
    public async Task InvalidBody_AnswersInTheApiErrorFormatWithAStableCode()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Validation");

        var res = await client.PostAsJsonAsync("/api/v1/idea-suggestions", new
        {
            category = "idea",
            title = "",
            description = "Description valide"
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("validation_failed", (await ReadErrorAsync(res)).GetProperty("reason").GetString());
    }

    [Fact]
    public async Task FailureInsideAuthentication_AnswersAJson500ThatTheBrowserCanRead()
    {
        var store = new FlakyTicketStore();
        var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
        {
            services.RemoveAll<ITicketStore>();
            services.AddSingleton<ITicketStore>(store);
        })).CreateClient();
        var email = $"u{Guid.NewGuid():N}@test.local";
        var register = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "Flaky" });
        register.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(client, register);
        store.FailRetrieve = true;

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        request.Headers.Add("Origin", "http://localhost:5173");
        var res = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.InternalServerError, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("internal_error", (await ReadErrorAsync(res)).GetProperty("reason").GetString());
        Assert.True(res.Headers.Contains("Access-Control-Allow-Origin"));
    }
}
