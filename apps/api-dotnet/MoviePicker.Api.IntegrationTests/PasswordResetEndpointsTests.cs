using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class PasswordResetEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonRead = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static readonly Regex ResetUrlRegex =
        new(@"https?://[^/\s]+/reset\?token=([A-Za-z0-9_-]+)", RegexOptions.Compiled);

    private readonly MoviePickerApplicationFactory _factory;

    public PasswordResetEndpointsTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _factory.FakeEmail.Clear();
    }

    private static async Task<string> RegisterUserAsync(HttpClient client, string email = "")
    {
        if (string.IsNullOrEmpty(email)) email = $"reset{Guid.NewGuid():N}@test.local";
        var body = new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "ResetTest" };
        var resp = await client.PostAsJsonAsync("/api/v1/auth/register", body);
        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        return email;
    }

    private static string ExtractTokenFromEmail(EmailMessage msg)
    {
        var m = ResetUrlRegex.Match(msg.HtmlBody);
        Assert.True(m.Success, "lien reset absent du HTML");
        return m.Groups[1].Value;
    }

    [Fact]
    public async Task RequestReset_UnknownEmail_Returns202_WithoutSendingEmail()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var resp = await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = "doesnotexist@test.local", Locale = "fr" });
        Assert.Equal(HttpStatusCode.Accepted, resp.StatusCode);
        Assert.Empty(_factory.FakeEmail.SentMessages);
    }

    [Fact]
    public async Task RequestReset_KnownEmail_Returns202_AndSendsEmailWithLink()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var email = await RegisterUserAsync(client);
        var resp = await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email, Locale = "fr" });
        Assert.Equal(HttpStatusCode.Accepted, resp.StatusCode);
        Assert.Single(_factory.FakeEmail.SentMessages);
        var msg = _factory.FakeEmail.SentMessages.First();
        Assert.Equal("password-reset", msg.Tag);
        Assert.Contains("/reset?token=", msg.HtmlBody);
    }

    [Fact]
    public async Task ConfirmReset_WithValidToken_Returns200_AndAllowsLoginWithNewPassword()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var email = await RegisterUserAsync(client);

        await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email, Locale = "fr" });
        var msg = _factory.FakeEmail.SentMessages.First();
        var plainToken = ExtractTokenFromEmail(msg);

        var confirmClient = _factory.CreateClient();
        var confirm = await confirmClient.PostAsJsonAsync("/api/v1/auth/password-reset/confirm",
            new PasswordResetConfirmRequest { Token = plainToken, NewPassword = "newpass1A" });
        Assert.Equal(HttpStatusCode.OK, confirm.StatusCode);
        var body = await confirm.Content.ReadFromJsonAsync<PasswordResetConfirmResponse>(JsonRead);
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Message));

        var loginOld = await confirmClient.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "abcd1234" });
        Assert.Equal(HttpStatusCode.Unauthorized, loginOld.StatusCode);

        var loginNew = await confirmClient.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest { Email = email, Password = "newpass1A" });
        Assert.Equal(HttpStatusCode.OK, loginNew.StatusCode);
    }

    [Fact]
    public async Task ConfirmReset_WithSameTokenTwice_SecondCallReturns400()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var email = await RegisterUserAsync(client);
        await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email, Locale = "fr" });
        var token = ExtractTokenFromEmail(_factory.FakeEmail.SentMessages.First());

        var first = await client.PostAsJsonAsync("/api/v1/auth/password-reset/confirm",
            new PasswordResetConfirmRequest { Token = token, NewPassword = "first1AAA" });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/v1/auth/password-reset/confirm",
            new PasswordResetConfirmRequest { Token = token, NewPassword = "second1AAA" });
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task ConfirmReset_WithInvalidToken_Returns400()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/auth/password-reset/confirm",
            new PasswordResetConfirmRequest { Token = "not-a-real-token", NewPassword = "abcd1234" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task ConfirmReset_WithWeakPassword_Returns400()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var email = await RegisterUserAsync(client);
        await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email });
        var token = ExtractTokenFromEmail(_factory.FakeEmail.SentMessages.First());

        var resp = await client.PostAsJsonAsync("/api/v1/auth/password-reset/confirm",
            new PasswordResetConfirmRequest { Token = token, NewPassword = "abc" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    [Fact]
    public async Task RequestReset_TwiceQuickly_OnlyFirstSendsEmail()
    {
        var client = _factory.CreateClient();
        _factory.FakeEmail.Clear();
        var email = await RegisterUserAsync(client);
        await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email });
        var firstCount = _factory.FakeEmail.SentMessages.Count;

        await client.PostAsJsonAsync("/api/v1/auth/password-reset/request",
            new PasswordResetRequest { Email = email });
        Assert.Equal(firstCount, _factory.FakeEmail.SentMessages.Count);
    }
}
