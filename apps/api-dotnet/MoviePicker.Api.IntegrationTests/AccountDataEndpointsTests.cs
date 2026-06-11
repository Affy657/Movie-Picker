using System.Net;
using System.Net.Http.Json;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class AccountDataEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public AccountDataEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, string Email)> RegisterAsync(string displayName = "RGPD")
    {
        var client = _factory.CreateClient();
        var email = $"u{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = displayName });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        IntegrationTestAuth.ApplySessionCookie(client, reg);
        return (client, email);
    }

    [Fact]
    public async Task ExportMyData_ReturnsJsonAttachmentWithPersonalData()
    {
        var (client, email) = await RegisterAsync("Exporter");

        var res = await client.GetAsync("/api/v1/auth/me/export");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("attachment", res.Content.Headers.ContentDisposition?.DispositionType);

        var body = await res.Content.ReadAsStringAsync();
        Assert.Contains("\"profile\"", body, StringComparison.Ordinal);
        Assert.Contains(email, body, StringComparison.Ordinal);
        Assert.Contains("\"exportedAt\"", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ExportMyData_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/auth/me/export");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task DeleteMe_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.DeleteAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task DeleteMe_WrongPassword_Returns401_AndAccountStillExists()
    {
        var (client, _) = await RegisterAsync();

        var del = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "wrongpass1" })
        });
        Assert.Equal(HttpStatusCode.Unauthorized, del.StatusCode);

        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
    }

    [Fact]
    public async Task DeleteMe_Success_Returns204_InvalidatesSession_AndFreesEmail()
    {
        var (client, email) = await RegisterAsync();

        var del = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/auth/me")
        {
            Content = JsonContent.Create(new DeleteAccountRequest { Password = "abcd1234" })
        });
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        IntegrationTestAuth.ApplySessionCookie(client, del);
        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);

        client.DefaultRequestHeaders.Remove("Cookie");
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "abcd1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);

        var reRegister = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "Reborn" });
        Assert.Equal(HttpStatusCode.Created, reRegister.StatusCode);
    }
}
