using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth.SignInDevices;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Web;

public sealed class SignInDeviceCookieTests
{
    private const string Token = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789-_AbCdE";

    private sealed class RecordingHandler : ISignInDeviceHandler
    {
        public List<SignInDeviceRequest> Requests { get; } = [];

        public Task<SignInDevice> HandleAsync(SignInDeviceRequest request, CancellationToken ct = default)
        {
            Requests.Add(request);
            return Task.FromResult(new SignInDevice(Token, "device-1"));
        }
    }

    private readonly RecordingHandler _handler = new();

    private CookieSigningInContext SigningIn(
        string? userId = "user-1",
        string? presentedCookie = null,
        string? method = SignInMethods.Google,
        string acceptLanguage = "en-GB,en;q=0.9",
        bool secure = true)
    {
        var http = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddSingleton<ISignInDeviceHandler>(_handler).BuildServiceProvider()
        };
        http.Request.Headers.UserAgent = "Mozilla/5.0 (X11; Linux x86_64) Firefox/133.0";
        http.Request.Headers.AcceptLanguage = acceptLanguage;
        if (presentedCookie is not null)
            http.Request.Headers.Cookie = $"{SignInDeviceCookie.Name}={presentedCookie}";
        var claims = userId is null ? [] : new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        var properties = new AuthenticationProperties();
        if (method is not null)
            SignInDeviceCookie.RememberMethod(properties, method);
        return new CookieSigningInContext(
            http,
            new AuthenticationScheme(CookieAuthenticationDefaults.AuthenticationScheme, null, typeof(CookieAuthenticationHandler)),
            new CookieAuthenticationOptions { Cookie = { SecurePolicy = secure ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest } },
            principal,
            properties,
            new CookieOptions());
    }

    [Fact]
    public async Task SignIn_HandsTheAccountTheBrowserAndTheMethodToTheDeviceHandler()
    {
        await SignInDeviceCookie.OnSigningInAsync(SigningIn(presentedCookie: "previous"));

        var request = Assert.Single(_handler.Requests);
        Assert.Equal("user-1", request.UserId);
        Assert.Equal("previous", request.PresentedToken);
        Assert.Equal("Mozilla/5.0 (X11; Linux x86_64) Firefox/133.0", request.UserAgent);
        Assert.Equal(SignInMethods.Google, request.Method);
        Assert.Equal(CatalogLanguage.English, request.Language);
    }

    [Fact]
    public async Task SignIn_TagsTheSessionWithTheDevice()
    {
        var context = SigningIn();

        await SignInDeviceCookie.OnSigningInAsync(context);

        Assert.Equal("device-1", context.Principal!.FindFirstValue(SignInDeviceCookie.ClaimType));
        Assert.False(context.Properties.Items.ContainsKey(SignInDeviceCookie.MethodItemKey));
    }

    [Fact]
    public async Task SignIn_SetsAYearLongHttpOnlyCookieScopedToTheAuthRoutes()
    {
        var context = SigningIn();

        await SignInDeviceCookie.OnSigningInAsync(context);

        var setCookie = context.HttpContext.Response.Headers.SetCookie.ToString();
        Assert.StartsWith($"{SignInDeviceCookie.Name}={Token};", setCookie);
        Assert.Contains("max-age=34560000", setCookie);
        Assert.Contains("path=/api/v1/auth", setCookie);
        Assert.Contains("secure", setCookie);
        Assert.Contains("samesite=lax", setCookie);
        Assert.Contains("httponly", setCookie);
    }

    [Fact]
    public async Task SignIn_OverPlainHttpInDevelopment_LeavesTheCookieUnsecured()
    {
        var context = SigningIn(secure: false);

        await SignInDeviceCookie.OnSigningInAsync(context);

        Assert.DoesNotContain("secure", context.HttpContext.Response.Headers.SetCookie.ToString());
    }

    [Fact]
    public async Task SignIn_WithoutAnAccountIdentifier_RemembersNothing()
    {
        var context = SigningIn(userId: null);

        await SignInDeviceCookie.OnSigningInAsync(context);

        Assert.Empty(_handler.Requests);
        Assert.Empty(context.HttpContext.Response.Headers.SetCookie.ToString());
    }

    [Fact]
    public async Task SignIn_WithoutLanguage_SpeaksFrench()
    {
        await SignInDeviceCookie.OnSigningInAsync(SigningIn(acceptLanguage: "", method: null));

        var request = Assert.Single(_handler.Requests);
        Assert.Equal(CatalogLanguage.French, request.Language);
        Assert.Null(request.Method);
    }
}
