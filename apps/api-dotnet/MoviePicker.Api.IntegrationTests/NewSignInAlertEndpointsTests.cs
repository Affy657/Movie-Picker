using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.SignInDevices;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class NewSignInAlertEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Password = "abcd1234";

    private readonly MoviePickerApplicationFactory _factory;

    public NewSignInAlertEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private HttpClient Browser(string? acceptLanguage = null)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0");
        if (acceptLanguage is not null)
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(acceptLanguage);
        return client;
    }

    private static async Task<(string Email, HttpResponseMessage Response)> RegisterAsync(HttpClient browser)
    {
        var email = $"alert{Guid.NewGuid():N}@test.local";
        var response = await browser.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = Password, DisplayName = "Alerte" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (email, response);
    }

    private static async Task LoginAsync(HttpClient browser, string email)
    {
        var response = await browser.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest { Email = email, Password = Password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private EmailMessage[] AlertsTo(string email) =>
        _factory.FakeEmail.SentMessages.Where(m => m.Tag == NewSignInEmailFactory.Tag && m.ToEmail == email).ToArray();

    [Fact]
    public async Task Register_RemembersTheBrowserWithoutAnyAlert()
    {
        var (email, response) = await RegisterAsync(Browser());

        var deviceCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), h => h.StartsWith(SignInDeviceCookie.Name + "=", StringComparison.Ordinal));
        Assert.Contains("path=/api/v1/auth", deviceCookie);
        Assert.Contains("httponly", deviceCookie);
        Assert.Empty(AlertsTo(email));
    }

    [Fact]
    public async Task SignInAgainFromTheSameBrowser_SendsNoAlert()
    {
        var browser = Browser();
        var (email, _) = await RegisterAsync(browser);
        Assert.Equal(HttpStatusCode.NoContent, (await browser.PostAsync("/api/v1/auth/logout", null)).StatusCode);

        await LoginAsync(browser, email);

        Assert.Empty(AlertsTo(email));
    }

    [Fact]
    public async Task SignInFromAnotherBrowser_SendsOneAlertInItsLanguage()
    {
        var (email, _) = await RegisterAsync(Browser());

        await LoginAsync(Browser("en-GB"), email);

        var alert = Assert.Single(AlertsTo(email));
        Assert.Equal("New sign-in to your Movie Picker account", alert.Subject);
        Assert.Contains("Firefox on Linux", alert.TextBody);
        Assert.Contains("with your password", alert.TextBody);
    }

    [Fact]
    public async Task SignInFromAnotherBrowser_StoresTheDeviceButNeverItsToken()
    {
        var (email, response) = await RegisterAsync(Browser());
        var token = response.Headers.GetValues("Set-Cookie")
            .Single(h => h.StartsWith(SignInDeviceCookie.Name + "=", StringComparison.Ordinal))
            .Split(';')[0][(SignInDeviceCookie.Name.Length + 1)..];
        await LoginAsync(Browser(), email);

        using var scope = _factory.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IUserRepository>().GetByEmailAsync(email);
        var devices = await scope.ServiceProvider.GetRequiredService<IKnownDeviceRepository>().ListByUserIdAsync(user!.Id);

        Assert.Equal(2, devices.Count);
        Assert.All(devices, d => Assert.Equal("Firefox", d.Browser));
        Assert.Contains(devices, d => d.TokenHash == SignInDeviceTokens.Hash(user.Id, token));
        Assert.DoesNotContain(devices, d => d.TokenHash == token);
    }
}
