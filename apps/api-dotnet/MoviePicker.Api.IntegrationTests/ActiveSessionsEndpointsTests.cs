using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ActiveSessionsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/sessions";
    private const string Password = "abcd1234";

    private const string WindowsChrome =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    private const string IphoneSafari =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public ActiveSessionsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private HttpClient ClientWithAgent(string userAgent)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd(userAgent);
        return client;
    }

    private async Task<(string Email, HttpClient Desktop)> RegisterOnDesktopAsync()
    {
        var email = $"u{Guid.NewGuid():N}@test.local";
        var desktop = ClientWithAgent(WindowsChrome);
        var reg = await desktop.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = Password, DisplayName = "Sessions" });
        reg.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(desktop, reg);
        return (email, desktop);
    }

    private async Task<HttpClient> SignInAsync(string email, string userAgent)
    {
        var client = ClientWithAgent(userAgent);
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest { Email = email, Password = Password });
        login.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(client, login);
        return client;
    }

    private static async Task<ActiveSessionListResponse> ListAsync(HttpClient client)
    {
        var list = await client.GetFromJsonAsync<ActiveSessionListResponse>(Route, Json);
        Assert.NotNull(list);
        return list!;
    }

    [Fact]
    public async Task List_ShowsEachSignedInDevice_CurrentFirst()
    {
        var (email, desktop) = await RegisterOnDesktopAsync();
        var phone = await SignInAsync(email, IphoneSafari);

        var fromPhone = await ListAsync(phone);

        Assert.Equal(2, fromPhone.Items.Count);
        var current = fromPhone.Items[0];
        Assert.True(current.Current);
        Assert.Equal("Safari", current.Browser);
        Assert.Equal("iOS", current.OperatingSystem);
        Assert.Equal(DeviceKind.Phone, current.DeviceKind);
        var other = fromPhone.Items[1];
        Assert.False(other.Current);
        Assert.Equal("Chrome", other.Browser);
        Assert.Equal("Windows", other.OperatingSystem);
        Assert.NotNull(other.LastActiveAt);

        var fromDesktop = await ListAsync(desktop);
        Assert.Equal("Windows", fromDesktop.Items[0].OperatingSystem);
    }

    [Fact]
    public async Task Revoke_SignsTheOtherDeviceOut_AndKeepsThisOne()
    {
        var (email, desktop) = await RegisterOnDesktopAsync();
        var phone = await SignInAsync(email, IphoneSafari);
        var phoneSession = (await ListAsync(desktop)).Items.Single(s => !s.Current);

        var revoke = await desktop.DeleteAsync($"{Route}/{phoneSession.Id}");

        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await phone.GetAsync(Route)).StatusCode);
        var remaining = await ListAsync(desktop);
        Assert.True(Assert.Single(remaining.Items).Current);
    }

    [Fact]
    public async Task Revoke_AnotherAccountsSession_IsNotFound()
    {
        var (_, owner) = await RegisterOnDesktopAsync();
        var (_, stranger) = await RegisterOnDesktopAsync();
        var ownerSession = (await ListAsync(owner)).Items.Single();

        var revoke = await stranger.DeleteAsync($"{Route}/{ownerSession.Id}");

        Assert.Equal(HttpStatusCode.NotFound, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync(Route)).StatusCode);
    }

    [Fact]
    public async Task RevokeOthers_SignsOutEveryOtherDevice()
    {
        var (email, desktop) = await RegisterOnDesktopAsync();
        var phone = await SignInAsync(email, IphoneSafari);
        var laptop = await SignInAsync(email, WindowsChrome);

        var revoke = await desktop.DeleteAsync($"{Route}/others");

        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await phone.GetAsync(Route)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await laptop.GetAsync(Route)).StatusCode);
        Assert.Single((await ListAsync(desktop)).Items);
    }

    [Fact]
    public async Task List_SignedOut_IsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(Route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
