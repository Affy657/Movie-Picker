using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
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

    private sealed class OversizedBodyStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                context.Request.Body = new OversizedRequestBody();
                return nextMiddleware(context);
            });
            next(app);
        };
    }

    private sealed class OversizedRequestBody : Stream
    {
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }

        public override int Read(byte[] buffer, int offset, int count) => throw TooLarge();

        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
            throw TooLarge();

        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken) =>
            throw TooLarge();

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        private static BadHttpRequestException TooLarge() =>
            new("Request body too large. The max request body size is 1048576 bytes.", StatusCodes.Status413PayloadTooLarge);
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

    [Theory]
    [InlineData("PATCH", "/api/v1/notifications/preferences", """{"preferences":[null]}""")]
    [InlineData("POST", "/api/v1/letterboxd/confirm", """{"selections":[null]}""")]
    [InlineData("POST", "/api/v1/idea-suggestions", """{"category":"idea","title":"Titre","description":"Description valide","attachments":[null]}""")]
    public async Task EmptyItemInARequestList_AnswersValidationFailedInsteadOfAServerError(string method, string path, string json)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ListeVide");

        var res = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
        });

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("validation_failed", (await ReadErrorAsync(res)).GetProperty("reason").GetString());
    }

    [Fact]
    public async Task BodyAboveTheServerLimit_Answers413InTheApiErrorFormat()
    {
        var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
            services.AddSingleton<IStartupFilter, OversizedBodyStartupFilter>())).CreateClient();

        var res = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = "big@test.local", Password = "abcd1234", DisplayName = "Big" });

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        var error = await ReadErrorAsync(res);
        Assert.Equal("validation_failed", error.GetProperty("reason").GetString());
        Assert.Equal(413, error.GetProperty("code").GetInt32());
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
