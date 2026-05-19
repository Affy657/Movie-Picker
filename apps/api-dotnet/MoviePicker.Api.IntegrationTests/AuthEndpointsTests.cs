using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class AuthEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonReadOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public AuthEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static void ApplySessionCookie(HttpClient client, HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var headers))
            return;
        foreach (var header in headers)
        {
            var prefix = AuthConstants.CookieName + "=";
            if (header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var pair = header.Split(';')[0].Trim();
                client.DefaultRequestHeaders.Remove("Cookie");
                client.DefaultRequestHeaders.Add("Cookie", pair);
                return;
            }
        }
    }

    [Fact]
    public async Task Register_Then_GetMe_ReturnsProfile()
    {
        var client = _factory.CreateClient();
        var email = $"u{Guid.NewGuid():N}@test.local";
        var register = new RegisterRequest
        {
            Email = email,
            Password = "abcd1234",
            DisplayName = "Intégration"
        };

        var reg = await client.PostAsJsonAsync("/api/v1/auth/register", register);
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        ApplySessionCookie(client, reg);

        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonReadOptions);
        Assert.NotNull(profile);
        Assert.Equal("Intégration", profile.DisplayName);
        Assert.Contains("***", profile.EmailMasked, StringComparison.Ordinal);
    }

    [Fact]
    public async Task GetMe_WithoutSession_Returns401()
    {
        var client = _factory.CreateClient();
        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var client = _factory.CreateClient();
        var email = $"dup{Guid.NewGuid():N}@test.local";
        var body = new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "A" };
        var first = await client.PostAsJsonAsync("/api/v1/auth/register", body);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var second = await client.PostAsJsonAsync("/api/v1/auth/register", body);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns401()
    {
        var client = _factory.CreateClient();
        var email = $"login{Guid.NewGuid():N}@test.local";
        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "L" });

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "wrongpass1" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task Login_Then_GetMe_ReturnsProfile()
    {
        var client = _factory.CreateClient();
        var email = $"logok{Guid.NewGuid():N}@test.local";
        await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "L1" });
        client.DefaultRequestHeaders.Remove("Cookie");

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "abcd1234" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        ApplySessionCookie(client, login);

        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonReadOptions);
        Assert.NotNull(profile);
        Assert.Equal("L1", profile!.DisplayName);
    }

    [Fact]
    public async Task Logout_Then_GetMe_Returns401()
    {
        var client = _factory.CreateClient();
        var email = $"out{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "O" });
        ApplySessionCookie(client, reg);

        var logout = await client.PostAsync("/api/v1/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task PatchMe_UpdatesDisplayName()
    {
        var client = _factory.CreateClient();
        var email = $"patch{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "Before" });
        ApplySessionCookie(client, reg);

        var patch = await client.PatchAsJsonAsync(
            "/api/v1/auth/me",
            new PatchUserProfileRequest { DisplayName = "After" });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<UserProfileResponse>(JsonReadOptions);
        Assert.NotNull(updated);
        Assert.Equal("After", updated!.DisplayName);

        var me = await client.GetAsync("/api/v1/auth/me");
        var again = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonReadOptions);
        Assert.Equal("After", again!.DisplayName);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400()
    {
        var client = _factory.CreateClient();
        var res = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest
            {
                Email = $"weak{Guid.NewGuid():N}@test.local",
                Password = "short",
                DisplayName = "W"
            });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = $"ghost{Guid.NewGuid():N}@test.local", Password = "abcd1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_Success_Returns204_AndSessionIsInvalidated()
    {
        var client = _factory.CreateClient();
        var email = $"cp{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "CP" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        ApplySessionCookie(client, reg);

        var change = await client.PatchAsJsonAsync(
            "/api/v1/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = "abcd1234", NewPassword = "wxyz5678" });
        Assert.Equal(HttpStatusCode.NoContent, change.StatusCode);

        ApplySessionCookie(client, change);
        var me = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);

        client.DefaultRequestHeaders.Remove("Cookie");
        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "wxyz5678" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns401()
    {
        var client = _factory.CreateClient();
        var email = $"cpw{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "CPW" });
        ApplySessionCookie(client, reg);

        var change = await client.PatchAsJsonAsync(
            "/api/v1/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = "wrongpass1", NewPassword = "wxyz5678" });
        Assert.Equal(HttpStatusCode.Unauthorized, change.StatusCode);

        client.DefaultRequestHeaders.Remove("Cookie");
        var loginOld = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "abcd1234" });
        Assert.Equal(HttpStatusCode.OK, loginOld.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WeakNewPassword_Returns400()
    {
        var client = _factory.CreateClient();
        var email = $"cpweak{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "CPK" });
        ApplySessionCookie(client, reg);

        var change = await client.PatchAsJsonAsync(
            "/api/v1/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = "abcd1234", NewPassword = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, change.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();
        var change = await client.PatchAsJsonAsync(
            "/api/v1/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = "abcd1234", NewPassword = "wxyz5678" });
        Assert.Equal(HttpStatusCode.Unauthorized, change.StatusCode);
    }

    [Fact]
    public async Task PatchMe_AccentColor_UpdatesAndReturns()
    {
        var client = _factory.CreateClient();
        var email = $"acc{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "AC" });
        ApplySessionCookie(client, reg);

        var patch = await client.PatchAsJsonAsync(
            "/api/v1/auth/me",
            new PatchUserProfileRequest { AccentColor = "purple" });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<UserProfileResponse>(JsonReadOptions);
        Assert.NotNull(updated);
        Assert.Equal(AccentColor.Purple, updated!.AccentColor);
    }

    [Fact]
    public async Task PatchMe_InvalidAccentColor_Returns400()
    {
        var client = _factory.CreateClient();
        var email = $"accbad{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "AB" });
        ApplySessionCookie(client, reg);

        var patch = await client.PatchAsJsonAsync(
            "/api/v1/auth/me",
            new { accentColor = "fuchsia" });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);
    }

    [Fact]
    public async Task PatchMe_InvalidUiTheme_Returns400()
    {
        var client = _factory.CreateClient();
        var email = $"badtheme{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "T" });
        ApplySessionCookie(client, reg);

        var patch = await client.PatchAsJsonAsync(
            "/api/v1/auth/me",
            new { uiTheme = "invalid" });
        Assert.Equal(HttpStatusCode.BadRequest, patch.StatusCode);
    }
}
